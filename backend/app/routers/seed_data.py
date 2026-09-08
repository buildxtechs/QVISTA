import datetime as dt
import random
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/seed", tags=["seed"])


@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    """Wipes all database tables for a clean slate."""
    db.query(models.HostDetection).delete()
    db.query(models.CloudInventory).delete()
    db.query(models.Asset).delete()
    db.query(models.Vulnerability).delete()
    db.query(models.Application).delete()
    db.query(models.Owner).delete()
    db.query(models.SyncHistory).delete()
    db.commit()
    return {"status": "success", "message": "Database reset successfully."}


@router.post("/demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    """Populates realistic demo data matching the UI dashboard and cloud accounts/subscriptions."""
    # First clear old demo data
    db.query(models.HostDetection).delete()
    db.query(models.CloudInventory).delete()
    db.query(models.Asset).delete()
    db.query(models.Vulnerability).delete()
    db.query(models.Application).delete()
    db.query(models.Owner).delete()
    db.query(models.SyncHistory).delete()
    db.commit()

    now = dt.datetime.utcnow()

    # 1. Owners
    owners_data = [
        ("CloudSec Platform Team", "cloudsec@vulnops.io", "Security Operations"),
        ("Payments Engineering", "payments-dev@vulnops.io", "FinTech Core"),
        ("Data & Analytics Squad", "data-infra@vulnops.io", "Data Platform"),
        ("Identity & Access Ops", "iam-admin@vulnops.io", "Infrastructure"),
        ("Customer Facing Apps", "customer-eng@vulnops.io", "Frontend & Mobile"),
    ]
    owners = {}
    for name, email, team in owners_data:
        o = models.Owner(name=name, email=email, team=team)
        db.add(o)
        db.flush()
        owners[name] = o

    # 2. Applications
    apps_data = [
        ("Payment Gateway Core", "Production", "Payments Engineering"),
        ("Customer Portal API", "Production", "Customer Facing Apps"),
        ("Enterprise Auth Service", "Production", "Identity & Access Ops"),
        ("Realtime Analytics Engine", "Production", "Data & Analytics Squad"),
        ("Billing & Settlement", "Production", "Payments Engineering"),
        ("Data Pipeline Ingestion", "Staging", "Data & Analytics Squad"),
        ("Internal Tools & Admin", "Development", "CloudSec Platform Team"),
    ]
    apps = {}
    for name, env, o_name in apps_data:
        app = models.Application(name=name, environment=env, technical_owner_id=owners[o_name].id)
        db.add(app)
        db.flush()
        apps[name] = app

    # 3. Vulnerability catalog (Top criticals and common findings)
    vulns_data = [
        ("38876", "OpenSSL Infinite Loop Denial of Service (CVE-2022-0778)", 5, "CVE-2022-0778"),
        ("376157", "Apache Log4j Remote Code Execution (Log4Shell)", 5, "CVE-2021-44228"),
        ("91823", "Microsoft Windows Remote Desktop Services RCE (BlueKeep)", 5, "CVE-2019-0708"),
        ("377192", "Spring Framework Remote Code Execution (Spring4Shell)", 5, "CVE-2022-22965"),
        ("150341", "OpenSSH Privilege Escalation via signal handler race (regreSSHion)", 5, "CVE-2024-6387"),
        ("38910", "Linux Kernel Local Privilege Escalation (Dirty Pipe)", 4, "CVE-2022-0847"),
        ("12098", "TLS 1.0 / 1.1 Protocol Deprecated Weak Cipher Suite", 3, "CVE-2015-4000"),
        ("38129", "Apache HTTP Server Path Traversal & File Disclosure", 4, "CVE-2021-41773"),
        ("11082", "SSH Weak Key Exchange Algorithms Enabled", 2, None),
        ("90045", "SSL Certificate Expired or Self-Signed", 2, None),
    ]
    vulns = []
    for qid, title, sev, cve in vulns_data:
        v = models.Vulnerability(
            qid=qid,
            title=title,
            severity=sev,
            cve=cve,
            category="Confirmed Vulnerability",
            threat="High risk of remote compromise or data exfiltration.",
            impact="Critical impact on host integrity and confidentiality.",
            solution="Apply vendor security patches immediately or restrict network port ingress.",
        )
        db.add(v)
        db.flush()
        vulns.append(v)

    # 4. AWS Accounts definition
    aws_accounts = [
        {"name": "AWS-Prod-Core", "id": "112233445566", "regions": ["us-east-1", "us-west-2"], "instances_target": 38},
        {"name": "AWS-Payments-PCI", "id": "998877665544", "regions": ["us-east-1", "eu-west-1"], "instances_target": 26},
        {"name": "AWS-DataLake-Analytics", "id": "554433221100", "regions": ["us-east-2", "us-west-2"], "instances_target": 22},
        {"name": "AWS-Staging-Workloads", "id": "332211009988", "regions": ["us-east-1"], "instances_target": 18},
        {"name": "AWS-SharedServices", "id": "778899001122", "regions": ["us-east-1", "ap-southeast-1"], "instances_target": 14},
    ]

    # 5. Azure Subscriptions definition
    azure_subs = [
        {"name": "Azure-Corp-Production", "id": "sub-4a8f9b21-e304-4c19", "rgs": ["rg-prod-core", "rg-prod-network"], "regions": ["eastus", "westus2"], "instances_target": 32},
        {"name": "Azure-Enterprise-Billing", "id": "sub-91b32f80-77a1-43ef", "rgs": ["rg-fintech-prod", "rg-settlements"], "regions": ["eastus2"], "instances_target": 24},
        {"name": "Azure-DataPlatform-EastUS", "id": "sub-2e88a0bc-5519-482d", "rgs": ["rg-synapse-data", "rg-storage-analytics"], "regions": ["eastus"], "instances_target": 20},
        {"name": "Azure-DevTest-Subscription", "id": "sub-6c7719d2-990a-4281", "rgs": ["rg-dev-sandbox", "rg-qa-eastus"], "regions": ["centralus"], "instances_target": 16},
    ]

    host_counter = 101

    # Helper to generate simulated assets
    for acct in aws_accounts:
        target = acct["instances_target"]
        acct_label = f"{acct['name']} ({acct['id']})"
        for i in range(target):
            is_matched = (i < int(target * 0.88)) # 88% coverage matched in Qualys
            ip_base = f"10.20.{host_counter // 256}.{host_counter % 254 + 1}"
            public_ip = f"54.210.{random.randint(10, 240)}.{random.randint(2, 250)}" if i % 3 == 0 else None
            instance_id = f"i-0{random.randint(100000000000, 999999999999):x}"
            hostname = f"aws-ec2-{acct['name'].lower()}-{i+1:02d}.corp.internal"
            region = random.choice(acct["regions"])
            app_choice = list(apps.values())[i % len(apps)]
            owner_choice = list(owners.values())[i % len(owners)]
            
            asset_obj = None
            if is_matched:
                asset_obj = models.Asset(
                    qualys_host_id=f"QID-HOST-{10000 + host_counter}",
                    ip=ip_base,
                    dns=hostname,
                    fqdn=f"{hostname}.vulnops.net",
                    os="Amazon Linux 2023" if i % 2 == 0 else "Ubuntu 22.04 LTS",
                    cloud_provider="AWS",
                    cloud_instance_id=instance_id,
                    last_scan=now - dt.timedelta(hours=random.randint(2, 48)),
                    last_vm_scan=now - dt.timedelta(hours=random.randint(2, 48)),
                    agent_id=f"AGENT-AWS-{random.randint(100000, 999999)}",
                    agent_status="Active",
                    asset_status="Running",
                    application_id=app_choice.id,
                    owner_id=owner_choice.id,
                )
                db.add(asset_obj)
                db.flush()

                num_findings = random.randint(1, 4) if (i % 2 == 0 or i % 3 == 0) else 0
                chosen_vulns = random.sample(vulns, min(num_findings, len(vulns)))
                used_ports = set()
                for v in chosen_vulns:
                    age = random.randint(3, 120)
                    is_breached = age > (14 if v.severity == 5 else 30)
                    port_choice = 443 if 443 not in used_ports else (22 if 22 not in used_ports else 8080 + len(used_ports))
                    used_ports.add(port_choice)
                    
                    existing_det = (
                        db.query(models.HostDetection)
                        .filter_by(asset_id=asset_obj.id, vulnerability_id=v.id, port=port_choice, protocol="tcp")
                        .first()
                    )
                    if not existing_det:
                        d = models.HostDetection(
                            asset_id=asset_obj.id,
                            vulnerability_id=v.id,
                            port=port_choice,
                            protocol="tcp",
                            status="Active",
                            first_found=now - dt.timedelta(days=age),
                            last_detected=now - dt.timedelta(hours=random.randint(1, 24)),
                            times_detected=random.randint(1, 8),
                            age_days=age,
                            sla_days=14 if v.severity == 5 else 30,
                            sla_status="BREACHED" if is_breached else "WITHIN_SLA",
                        )
                        db.add(d)

            # Cloud inventory row
            cloud_rec = models.CloudInventory(
                cloud_provider="AWS",
                private_ip=ip_base,
                public_ip=public_ip,
                instance_id=instance_id,
                instance_name=hostname,
                account_or_subscription=acct_label,
                region=region,
                os="Linux",
                status="Running" if i % 10 != 0 else "Stopped",
                application_name=app_choice.name,
                owner_name=owner_choice.name,
                source_file="aws_production_export.csv",
                asset_id=asset_obj.id if asset_obj else None,
                match_status="MATCHED" if asset_obj else "UNMATCHED",
                match_method="private_ip" if asset_obj else None,
            )
            db.add(cloud_rec)
            host_counter += 1

    # Azure Subscriptions instances
    for sub in azure_subs:
        target = sub["instances_target"]
        sub_label = f"{sub['name']} ({sub['id']})"
        for i in range(target):
            is_matched = (i < int(target * 0.85)) # 85% coverage
            ip_base = f"10.40.{host_counter // 256}.{host_counter % 254 + 1}"
            public_ip = f"20.120.{random.randint(10, 240)}.{random.randint(2, 250)}" if i % 4 == 0 else None
            instance_id = f"/subscriptions/{sub['id']}/resourceGroups/{random.choice(sub['rgs'])}/providers/Microsoft.Compute/virtualMachines/vm-{sub['name'].lower()}-{i+1:02d}"
            hostname = f"az-vm-{sub['name'].lower()}-{i+1:02d}.internal.cloud"
            region = random.choice(sub["regions"])
            rg = random.choice(sub["rgs"])
            app_choice = list(apps.values())[(i + 2) % len(apps)]
            owner_choice = list(owners.values())[(i + 1) % len(owners)]

            asset_obj = None
            if is_matched:
                asset_obj = models.Asset(
                    qualys_host_id=f"QID-HOST-{10000 + host_counter}",
                    ip=ip_base,
                    dns=hostname,
                    fqdn=f"{hostname}.azure.vulnops.net",
                    os="Windows Server 2022" if i % 2 == 0 else "RHEL 9.2",
                    cloud_provider="AZURE",
                    cloud_instance_id=instance_id,
                    last_scan=now - dt.timedelta(hours=random.randint(4, 72)),
                    last_vm_scan=now - dt.timedelta(hours=random.randint(4, 72)),
                    agent_id=f"AGENT-AZ-{random.randint(100000, 999999)}",
                    agent_status="Active",
                    asset_status="Running",
                    application_id=app_choice.id,
                    owner_id=owner_choice.id,
                )
                db.add(asset_obj)
                db.flush()

                num_findings = random.randint(1, 3) if i % 2 == 0 else 0
                chosen_vulns_az = random.sample(vulns, min(num_findings, len(vulns)))
                used_az_ports = set()
                for v in chosen_vulns_az:
                    age = random.randint(5, 95)
                    is_breached = age > (14 if v.severity == 5 else 30)
                    default_p = 3389 if "Windows" in asset_obj.os else 443
                    port_choice = default_p if default_p not in used_az_ports else (22 if 22 not in used_az_ports else 8443 + len(used_az_ports))
                    used_az_ports.add(port_choice)

                    existing_det = (
                        db.query(models.HostDetection)
                        .filter_by(asset_id=asset_obj.id, vulnerability_id=v.id, port=port_choice, protocol="tcp")
                        .first()
                    )
                    if not existing_det:
                        d = models.HostDetection(
                            asset_id=asset_obj.id,
                            vulnerability_id=v.id,
                            port=port_choice,
                            protocol="tcp",
                            status="Active",
                            first_found=now - dt.timedelta(days=age),
                            last_detected=now - dt.timedelta(hours=random.randint(2, 36)),
                            times_detected=random.randint(1, 6),
                            age_days=age,
                            sla_days=14 if v.severity == 5 else 30,
                            sla_status="BREACHED" if is_breached else "WITHIN_SLA",
                        )
                        db.add(d)

            cloud_rec = models.CloudInventory(
                cloud_provider="AZURE",
                private_ip=ip_base,
                public_ip=public_ip,
                instance_id=instance_id,
                instance_name=hostname,
                account_or_subscription=sub_label,
                resource_group=rg,
                region=region,
                os="Windows" if i % 2 == 0 else "Linux",
                status="Running",
                application_name=app_choice.name,
                owner_name=owner_choice.name,
                source_file="azure_resources_inventory.xlsx",
                asset_id=asset_obj.id if asset_obj else None,
                match_status="MATCHED" if asset_obj else "UNMATCHED",
                match_method="private_ip" if asset_obj else None,
            )
            db.add(cloud_rec)
            host_counter += 1

    # Record sync history
    sync = models.SyncHistory(
        started_at=now - dt.timedelta(minutes=14),
        finished_at=now - dt.timedelta(minutes=11),
        status="success",
        hosts_processed=host_counter - 100,
        findings_processed=db.query(models.HostDetection).count(),
        new_findings=42,
        fixed_findings=18,
    )
    db.add(sync)
    db.commit()

    return {
        "status": "success",
        "message": "Demo data successfully seeded with multi-account AWS & Azure inventories and Qualys correlation.",
        "assets_created": db.query(models.Asset).count(),
        "cloud_records_created": db.query(models.CloudInventory).count(),
        "detections_created": db.query(models.HostDetection).count(),
        "aws_accounts": len(aws_accounts),
        "azure_subscriptions": len(azure_subs),
    }
