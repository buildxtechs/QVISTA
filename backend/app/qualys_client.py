"""
Thin client around the Qualys VMDR (VM/PC) API v2.

Docs (for reference when adapting to your subscription/API server):
  https://<platform_url>/api/2.0/fo/asset/host/vm/detection/  (Host List Detection)
  https://<platform_url>/msp/about.php                        (connection test / version)

Notes:
- Qualys API servers differ by platform (US1-US4, EU1-EU3, IN1, etc). Get the
  correct `platform_url` for your subscription from the Qualys UI under
  Help > About, or from your Technical Account Manager.
- Auth is HTTP Basic over TLS. Qualys requires the `X-Requested-With` header.
- Responses are XML. We parse with lxml.
- The Host List Detection API is paginated via `truncation_limit` +
  the `<WARNING><URL>` continuation link Qualys returns when more data
  remains - we follow that link rather than re-deriving params ourselves,
  which is the approach Qualys recommends.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Iterator

import requests
from lxml import etree

DEFAULT_TIMEOUT = 120


class QualysAPIError(RuntimeError):
    pass


@dataclass
class Detection:
    qid: str
    type: str | None
    severity: int | None
    port: int | None
    protocol: str | None
    ssl: bool
    status: str | None
    first_found: dt.datetime | None
    last_found: dt.datetime | None
    times_found: int
    last_fixed: dt.datetime | None
    first_reopened: dt.datetime | None
    last_reopened: dt.datetime | None
    times_reopened: int


@dataclass
class HostRecord:
    host_id: str
    ip: str | None
    dns: str | None
    netbios: str | None
    fqdn: str | None
    os: str | None
    tracking_method: str | None
    cloud_provider: str | None
    cloud_instance_id: str | None
    last_vuln_scan_datetime: dt.datetime | None
    agent_id: str | None
    detections: list[Detection] = field(default_factory=list)


def _text(el, path) -> str | None:
    node = el.find(path)
    if node is None or node.text is None:
        return None
    return node.text.strip()


def _parse_dt(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            return dt.datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


class QualysClient:
    def __init__(self, platform_url: str, username: str, password: str, timeout: int = DEFAULT_TIMEOUT):
        url = platform_url.rstrip("/")
        # Qualys API endpoints use qualysapi.<platform> rather than qualysguard.<platform>
        if "qualysguard." in url:
            url = url.replace("qualysguard.", "qualysapi.")
        self.base_url = url
        self.auth = (username, password)
        self.timeout = timeout
        self.headers = {"X-Requested-With": "VulnOps/1.0"}

    def test_connection(self) -> dict:
        """Lightweight call to validate credentials & connectivity."""
        url = f"{self.base_url}/msp/about.php"
        try:
            resp = requests.get(url, auth=self.auth, headers=self.headers, timeout=self.timeout)
        except requests.exceptions.ConnectionError as e:
            raise QualysAPIError(
                f"Network / DNS connection failed for platform URL '{self.base_url}'. Please verify your URL format (e.g. https://qualysapi.qg2.apps.qualys.com) and internet connectivity."
            )
        except requests.exceptions.Timeout:
            raise QualysAPIError(
                f"Connection timed out while reaching '{self.base_url}'. Please check network latency or firewall rules."
            )
        except requests.exceptions.RequestException as e:
            raise QualysAPIError(f"Failed to connect to Qualys API: {e}")

        if resp.status_code == 401:
            raise QualysAPIError("Authentication failed — invalid username or password, or API access is not enabled on this account.")
        if resp.status_code != 200:
            raise QualysAPIError(f"Unexpected response from Qualys (HTTP {resp.status_code}): {resp.text[:300]}")
        return {"status": "ok", "raw": resp.text[:2000]}

    def fetch_host_list_detection(
        self,
        truncation_limit: int = 1000,
        vm_scan_since: dt.datetime | None = None,
    ) -> Iterator[HostRecord]:
        """
        Streams HostRecord objects from the Host List Detection API,
        following Qualys' pagination automatically.
        """
        url = f"{self.base_url}/api/2.0/fo/asset/host/vm/detection/"
        params = {
            "action": "list",
            "show_asset_id": "1",
            "show_tags": "1",
            "truncation_limit": str(truncation_limit),
            "output_format": "XML",
        }
        if vm_scan_since:
            params["vm_scan_date_after"] = vm_scan_since.strftime("%Y-%m-%d")

        next_url = url
        next_params = params

        while next_url:
            resp = requests.post(
                next_url, data=next_params, auth=self.auth, headers=self.headers, timeout=self.timeout
            )
            if resp.status_code != 200:
                # Provide descriptive error if Qualys returns XML error message
                err_text = resp.text
                if "<TEXT>" in err_text:
                    try:
                        err_root = etree.fromstring(resp.content)
                        text_node = err_root.find(".//TEXT")
                        if text_node is not None and text_node.text:
                            err_text = text_node.text.strip()
                    except Exception:
                        pass
                raise QualysAPIError(f"Qualys API error {resp.status_code}: {err_text[:500]}")

            root = etree.fromstring(resp.content)
            for host_el in root.iter("HOST"):
                yield self._parse_host(host_el)

            # Follow Qualys' truncation warning for pagination, if present
            warning = root.find(".//WARNING")
            next_url = None
            next_params = None
            if warning is not None:
                url_el = warning.find("URL")
                if url_el is not None and url_el.text:
                    next_url = url_el.text.strip()
                    next_params = {}  # continuation URL already has all query params embedded

    @staticmethod
    def _parse_host(host_el) -> HostRecord:
        detections: list[Detection] = []
        for d in host_el.iter("DETECTION"):
            detections.append(
                Detection(
                    qid=_text(d, "QID") or "",
                    type=_text(d, "TYPE"),
                    severity=int(_text(d, "SEVERITY") or 0) or None,
                    port=int(p) if (p := _text(d, "PORT")) and p.strip().isdigit() else None,
                    protocol=_text(d, "PROTOCOL"),
                    ssl=(_text(d, "SSL") == "1"),
                    status=_text(d, "STATUS"),
                    first_found=_parse_dt(_text(d, "FIRST_FOUND_DATETIME")),
                    last_found=_parse_dt(_text(d, "LAST_FOUND_DATETIME")),
                    times_found=int(_text(d, "TIMES_FOUND") or 1),
                    last_fixed=_parse_dt(_text(d, "LAST_FIXED_DATETIME")),
                    first_reopened=_parse_dt(_text(d, "FIRST_REOPENED_DATETIME")),
                    last_reopened=_parse_dt(_text(d, "LAST_REOPENED_DATETIME")),
                    times_reopened=int(_text(d, "TIMES_REOPENED") or 0),
                )
            )

        tracking = _text(host_el, "TRACKING_METHOD") or ""
        agent_info = host_el.find(".//CLOUD_AGENT") or host_el.find(".//AGENT_INFO") or host_el.find(".//QUALYS_CLOUD_AGENT")
        agent_id = _text(host_el, "AGENT_ID") or (_text(agent_info, "AGENT_ID") if agent_info is not None else None)
        
        # If Qualys tagged it with QAGENT or Cloud Agent sensor exists
        if "QAGENT" in tracking.upper() or "AGENT" in tracking.upper() or agent_id:
            tracking = "AGENT"

        cloud_prov = _text(host_el, "CLOUD_PROVIDER")
        cloud_inst = _text(host_el, "CLOUD_RESOURCE_ID") or _text(host_el, "EC2_INSTANCE_ID") or _text(host_el, "INSTANCE_ID")

        # Parse EC2 / Cloud attributes if present in XML tags
        if not cloud_prov:
            if cloud_inst and cloud_inst.startswith("i-"):
                cloud_prov = "AWS"
            elif _text(host_el, "EC2_INFO") is not None or _text(host_el, "AWS_ACCOUNT_ID") is not None:
                cloud_prov = "AWS"
            elif _text(host_el, "AZURE_VM_ID") is not None:
                cloud_prov = "AZURE"

        return HostRecord(
            host_id=_text(host_el, "ID") or _text(host_el, "ASSET_ID") or "",
            ip=_text(host_el, "IP"),
            dns=_text(host_el, "DNS"),
            netbios=_text(host_el, "NETBIOS"),
            fqdn=_text(host_el, "FQDN") or _text(host_el, "DNS"),
            os=_text(host_el, "OS"),
            tracking_method=tracking or "IP",
            cloud_provider=cloud_prov,
            cloud_instance_id=cloud_inst,
            last_vuln_scan_datetime=_parse_dt(_text(host_el, "LAST_VULN_SCAN_DATETIME")),
            agent_id=agent_id,
            detections=detections,
        )
