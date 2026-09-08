"""
Qualys Multi-Cloud IASP and Power BI Report Automation Tool
Streamlit Interactive Application.
"""
import io
import datetime as dt
import pandas as pd
import streamlit as st

from config import ToolConfig, get_default_config
from validation import AuditLogger
from column_mapping import (
    QUALYS_EXPECTED_COLUMNS, AWS_EXPECTED_COLUMNS,
    AZURE_EXPECTED_COLUMNS, CMDB_EXPECTED_COLUMNS,
    EXCEPTION_EXPECTED_COLUMNS, map_dataframe_columns
)
from processor import process_datasets
from exporter import export_iasp_workbook, export_powerbi_workbook

# Page Config
st.set_page_config(
    page_title="Qualys Multi-Cloud IASP & Power BI Automation Tool",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Professional Corporate Theme
st.markdown("""
<style>
    .main-header {
        font-size: 26px;
        font-weight: 800;
        color: #1E3A8A;
        margin-bottom: 2px;
    }
    .sub-header {
        font-size: 13px;
        color: #64748B;
        font-family: monospace;
        margin-bottom: 20px;
    }
    .metric-card {
        background: #FFFFFF;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 16px;
        font-weight: 600;
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

# Session State Initialization
if "config" not in st.session_state:
    st.session_state.config = get_default_config()
if "qualys_raw" not in st.session_state:
    st.session_state.qualys_raw = None
if "aws_raw" not in st.session_state:
    st.session_state.aws_raw = None
if "azure_raw" not in st.session_state:
    st.session_state.azure_raw = None
if "cmdb_raw" not in st.session_state:
    st.session_state.cmdb_raw = None
if "exceptions_raw" not in st.session_state:
    st.session_state.exceptions_raw = None
if "results" not in st.session_state:
    st.session_state.results = None
if "logger" not in st.session_state:
    st.session_state.logger = AuditLogger()

# Top Header
st.markdown('<div class="main-header">🛡️ Qualys Multi-Cloud IASP and Power BI Report Automation Tool</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">ENTERPRISE VULNERABILITY INGESTION • MULTI-CLOUD CORRELATION • SLA GOVERNANCE • IASP & POWER BI EXPORTS</div>', unsafe_allow_html=True)

# Navigation Tabs
tabs = st.tabs([
    "1. Upload Files",
    "2. Column Mapping",
    "3. Configure Rules",
    "4. Process Data",
    "5. Data Quality & Exceptions",
    "6. IASP Preview",
    "7. Power BI Preview",
    "8. Export Reports",
    "9. Run Audit Log"
])

def load_file_to_df(uploaded_file, file_type_key: str):
    if uploaded_file is None:
        return None
    fname = uploaded_file.name.lower()
    try:
        if fname.endswith((".xlsx", ".xls")):
            xl = pd.ExcelFile(uploaded_file)
            sheet_names = xl.sheet_names
            selected_sheet = sheet_names[0]
            if len(sheet_names) > 1:
                selected_sheet = st.selectbox(
                    f"Select sheet for {uploaded_file.name}:",
                    sheet_names,
                    key=f"sheet_{file_type_key}"
                )
            return pd.read_excel(uploaded_file, sheet_name=selected_sheet)
        else:
            return pd.read_csv(uploaded_file)
    except Exception as e:
        st.error(f"Error reading {uploaded_file.name}: {e}")
        return None

# ====================================================================
# TAB 1: UPLOAD FILES
# ====================================================================
with tabs[0]:
    st.subheader("📁 Mandatory & Optional Input Uploads")
    st.info("Upload raw data files locally. No data leaves your machine.")
    
    col1, col2 = st.columns(2)
    with col1:
        q_file = st.file_uploader("1. Qualys Raw Report (Mandatory)", type=["csv", "xlsx", "xls"], key="up_qualys")
        if q_file:
            df = load_file_to_df(q_file, "qualys")
            if df is not None:
                st.session_state.qualys_raw, _, missing = map_dataframe_columns(df, QUALYS_EXPECTED_COLUMNS)
                st.success(f"✅ Qualys Raw Uploaded: {len(st.session_state.qualys_raw):,} findings")

        aws_file = st.file_uploader("2. AWS Running Inventory (Mandatory)", type=["csv", "xlsx", "xls"], key="up_aws")
        if aws_file:
            df = load_file_to_df(aws_file, "aws")
            if df is not None:
                st.session_state.aws_raw, _, _ = map_dataframe_columns(df, AWS_EXPECTED_COLUMNS)
                st.success(f"✅ AWS Inventory Uploaded: {len(st.session_state.aws_raw):,} instances")

    with col2:
        az_file = st.file_uploader("3. Azure Running Inventory (Mandatory)", type=["csv", "xlsx", "xls"], key="up_azure")
        if az_file:
            df = load_file_to_df(az_file, "azure")
            if df is not None:
                st.session_state.azure_raw, _, _ = map_dataframe_columns(df, AZURE_EXPECTED_COLUMNS)
                st.success(f"✅ Azure Inventory Uploaded: {len(st.session_state.azure_raw):,} VMs")

        cmdb_file = st.file_uploader("4. Enterprise CMDB Extract (Mandatory)", type=["csv", "xlsx", "xls"], key="up_cmdb")
        if cmdb_file:
            df = load_file_to_df(cmdb_file, "cmdb")
            if df is not None:
                st.session_state.cmdb_raw, _, _ = map_dataframe_columns(df, CMDB_EXPECTED_COLUMNS)
                st.success(f"✅ CMDB Data Uploaded: {len(st.session_state.cmdb_raw):,} applications")

    st.markdown("---")
    st.subheader("Optional Register Upload")
    exc_file = st.file_uploader("5. Exception & False Positive Register (Optional)", type=["csv", "xlsx", "xls"], key="up_exc")
    if exc_file:
        df = load_file_to_df(exc_file, "exc")
        if df is not None:
            st.session_state.exceptions_raw, _, _ = map_dataframe_columns(df, EXCEPTION_EXPECTED_COLUMNS)
            st.success(f"✅ Exception Register Loaded: {len(st.session_state.exceptions_raw):,} records")

# ====================================================================
# TAB 2: COLUMN MAPPING
# ====================================================================
with tabs[1]:
    st.subheader("🗺️ Configurable Column Mappings")
    st.markdown("Verify the detected schema and override mappings if custom source headers were used.")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Qualys Fields Detected**")
        if st.session_state.qualys_raw is not None:
            st.dataframe(pd.DataFrame({"Mapped Columns": st.session_state.qualys_raw.columns}), height=250)
        else:
            st.warning("Upload Qualys Raw file first.")

        st.markdown("**AWS Inventory Fields Detected**")
        if st.session_state.aws_raw is not None:
            st.dataframe(pd.DataFrame({"Mapped Columns": st.session_state.aws_raw.columns}), height=250)
        else:
            st.warning("Upload AWS Inventory first.")

    with col2:
        st.markdown("**Azure Inventory Fields Detected**")
        if st.session_state.azure_raw is not None:
            st.dataframe(pd.DataFrame({"Mapped Columns": st.session_state.azure_raw.columns}), height=250)
        else:
            st.warning("Upload Azure Inventory first.")

        st.markdown("**CMDB Fields Detected**")
        if st.session_state.cmdb_raw is not None:
            st.dataframe(pd.DataFrame({"Mapped Columns": st.session_state.cmdb_raw.columns}), height=250)
        else:
            st.warning("Upload CMDB data first.")

# ====================================================================
# TAB 3: CONFIGURE RULES
# ====================================================================
with tabs[2]:
    st.subheader("⚙️ SLA & Governance Rules Configuration")
    cfg = st.session_state.config
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("### SLA Policy (Days)")
        s5_sla = st.number_input("Critical (Severity 5) SLA Days", value=cfg.sla_days_map[5], min_value=1)
        s4_sla = st.number_input("High (Severity 4) SLA Days", value=cfg.sla_days_map[4], min_value=1)
        s3_sla = st.number_input("Medium (Severity 3) SLA Days", value=cfg.sla_days_map[3], min_value=1)
        cfg.sla_days_map[5] = s5_sla
        cfg.sla_days_map[4] = s4_sla
        cfg.sla_days_map[3] = s3_sla

    with col2:
        st.markdown("### Processing Controls")
        proc_date = st.date_input("Current Processing Date (for Age / SLA)", value=cfg.processing_date)
        cfg.processing_date = proc_date
        
        dup_opt = st.selectbox(
            "Duplicate Findings Handling",
            ["keep_all", "keep_latest", "keep_first"],
            index=0,
            format_func=lambda x: "Keep All (Default)" if x == "keep_all" else ("Keep Latest Finding" if x == "keep_latest" else "Keep First Finding")
        )
        cfg.duplicate_handling = dup_opt
        
        cfg.allow_hostname_fallback = st.checkbox("Enable Hostname Fallback Matching", value=cfg.allow_hostname_fallback)
        cfg.allow_motsid_fallback = st.checkbox("Enable CAT-MOTSID Fallback", value=cfg.allow_motsid_fallback)

    with col3:
        st.markdown("### Regex & Active Filtering")
        regex_in = st.text_input("5-Digit Correlation ID Regex", value=cfg.correlation_regex)
        cfg.correlation_regex = regex_in
        cfg.cmdb_active_only = st.checkbox("Enforce Active CMDB Records Only", value=cfg.cmdb_active_only)

# ====================================================================
# TAB 4: PROCESS DATA
# ====================================================================
with tabs[3]:
    st.subheader("🚀 Execute Processing & Reconciliation")
    
    ready = st.session_state.qualys_raw is not None
    if not ready:
        st.warning("Please upload the mandatory Qualys Raw Report to begin.")
    else:
        if st.button("▶ Run Full Multi-Cloud Processing Pipeline", type="primary"):
            with st.spinner("Processing findings, executing cloud matching, and calculating SLA..."):
                logger = AuditLogger()
                st.session_state.logger = logger
                results = process_datasets(
                    qualys_df=st.session_state.qualys_raw,
                    aws_df=st.session_state.aws_raw,
                    azure_df=st.session_state.azure_raw,
                    cmdb_df=st.session_state.cmdb_raw,
                    exceptions_df=st.session_state.exceptions_raw,
                    config=st.session_state.config,
                    logger=logger
                )
                st.session_state.results = results
                st.success("🎉 Processing completed successfully!")

    if st.session_state.results is not None:
        sm = st.session_state.results["summary"]
        
        st.markdown("### 📊 Processing & Reconciliation Summary")
        kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
        kpi1.metric("Total Qualys Input", f"{sm['qualys_input_rows']:,}")
        kpi2.metric("Final Matched Findings", f"{sm['final_iasp_rows']:,}")
        kpi3.metric("Critical (Sev 5)", f"{sm['critical_count']:,}")
        kpi4.metric("High (Sev 4)", f"{sm['high_count']:,}")
        kpi5.metric("Past Due SLA", f"{sm['past_due_sla']:,}")

        st.markdown("---")
        rec_col1, rec_col2 = st.columns(2)
        with rec_col1:
            st.markdown("#### Input Reconciliation")
            st.write(f"- Input Rows: **{sm['qualys_input_rows']:,}**")
            st.write(f"- Sev 1 Excluded: **{sm['severity_1_excluded']:,}**")
            st.write(f"- Sev 2 Excluded: **{sm['severity_2_excluded']:,}**")
            st.write(f"- Invalid Severity / IP / QID: **{sm['invalid_severity_rows'] + sm['invalid_ip_rows'] + sm['missing_qid_rows']:,}**")
            st.write(f"- Retained Sev 3/4/5: **{sm['retained_sev345_input']:,}**")

        with rec_col2:
            st.markdown("#### Cloud Inventory Matching")
            st.write(f"- AWS Matched: **{sm['aws_matched']:,}**")
            st.write(f"- Azure Matched: **{sm['azure_matched']:,}**")
            st.write(f"- Unmatched Findings: **{sm['unmatched']:,}**")
            st.write(f"- Non-Running Assets: **{sm['non_running']:,}**")
            st.write(f"- Ambiguous Matches: **{sm['ambiguous']:,}**")
            
        if sm["reconciliation_passed"]:
            st.success("✅ Complete Automated Reconciliation Check Passed (100% Accounted For)")
        else:
            st.error("❌ Reconciliation Check Discrepancy Detected")

# ====================================================================
# TAB 5: DATA QUALITY & EXCEPTIONS
# ====================================================================
with tabs[4]:
    st.subheader("🛡️ Data Quality Issues & Exceptions Hub")
    if st.session_state.results is not None:
        dq_df = st.session_state.results["data_quality_df"]
        st.markdown(f"**Total Logged Issues: {len(dq_df):,}**")
        st.dataframe(dq_df, use_container_width=True, height=350)
    else:
        st.info("Run processing in Tab 4 to view quality logs.")

# ====================================================================
# TAB 6: IASP PREVIEW
# ====================================================================
with tabs[5]:
    st.subheader("📄 Final IASP Report Preview")
    if st.session_state.results is not None:
        iasp_preview = st.session_state.results["iasp_df"]
        st.markdown(f"**Total Rows: {len(iasp_preview):,}**")
        st.dataframe(iasp_preview.head(100), use_container_width=True, height=450)
    else:
        st.info("Run processing in Tab 4 to generate the IASP report.")

# ====================================================================
# TAB 7: POWER BI PREVIEW
# ====================================================================
with tabs[6]:
    st.subheader("📈 Final Power BI Report Preview")
    if st.session_state.results is not None:
        pbi_preview = st.session_state.results["powerbi_df"]
        st.markdown(f"**Total Rows: {len(pbi_preview):,}**")
        st.dataframe(pbi_preview.head(100), use_container_width=True, height=450)
    else:
        st.info("Run processing in Tab 4 to generate the Power BI report.")

# ====================================================================
# TAB 8: EXPORT REPORTS
# ====================================================================
with tabs[7]:
    st.subheader("💾 Download Enriched Excel & CSV Reports")
    if st.session_state.results is not None:
        res = st.session_state.results
        timestamp = dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### 📊 IASP Enriched Workbook")
            iasp_excel = export_iasp_workbook(res, st.session_state.config)
            st.download_button(
                label=f"⬇️ Download IASP_Enriched_Report_{timestamp}.xlsx",
                data=iasp_excel,
                file_name=f"IASP_Enriched_Report_{timestamp}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                type="primary"
            )
            
            iasp_csv = res["iasp_df"].to_csv(index=False).encode("utf-8")
            st.download_button(
                label="⬇️ Download IASP Report (CSV)",
                data=iasp_csv,
                file_name=f"IASP_Report_{timestamp}.csv",
                mime="text/csv"
            )

        with col2:
            st.markdown("### 📈 Power BI Enriched Workbook")
            pbi_excel = export_powerbi_workbook(res, st.session_state.config)
            st.download_button(
                label=f"⬇️ Download PowerBI_Qualys_Report_{timestamp}.xlsx",
                data=pbi_excel,
                file_name=f"PowerBI_Qualys_Report_{timestamp}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                type="primary"
            )
            
            pbi_csv = res["powerbi_df"].to_csv(index=False).encode("utf-8")
            st.download_button(
                label="⬇️ Download Power BI Report (CSV)",
                data=pbi_csv,
                file_name=f"PowerBI_Report_{timestamp}.csv",
                mime="text/csv"
            )
    else:
        st.info("Run processing in Tab 4 to enable download buttons.")

# ====================================================================
# TAB 9: RUN AUDIT LOG
# ====================================================================
with tabs[8]:
    st.subheader("📜 Run History & Pipeline Execution Audit Trail")
    if st.session_state.logger is not None:
        logs_df = pd.DataFrame(st.session_state.logger.event_logs)
        st.dataframe(logs_df, use_container_width=True)
