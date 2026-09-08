"""
Professional Excel Workbook & CSV Export Engine with XlsxWriter styling.
"""
import io
import datetime as dt
import pandas as pd
import xlsxwriter
from .config import ToolConfig

def export_iasp_workbook(
    results: dict,
    config: ToolConfig,
    field_mapping: dict | None = None
) -> bytes:
    """
    Generates IASP_Enriched_Report_YYYYMMDD_HHMMSS.xlsx with all audit sheets and conditional formatting.
    """
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        workbook = writer.book
        
        # Formats
        header_fmt = workbook.add_format({
            "bold": True,
            "font_color": "#FFFFFF",
            "bg_color": "#1E3A8A", # Dark Royal Blue
            "border": 1,
            "align": "center",
            "valign": "vcenter"
        })
        text_fmt = workbook.add_format({"text_wrap": False})
        wrap_fmt = workbook.add_format({"text_wrap": True})
        crit_fmt = workbook.add_format({"bg_color": "#FEE2E2", "font_color": "#991B1B", "bold": True})
        high_fmt = workbook.add_format({"bg_color": "#FFEDD5", "font_color": "#9A3412", "bold": True})
        med_fmt = workbook.add_format({"bg_color": "#FEF9C3", "font_color": "#854D0E", "bold": True})
        
        # 1. Main IASP Sheet
        iasp_df = results.get("iasp_df", pd.DataFrame())
        iasp_df.to_excel(writer, sheet_name="IASP Report", index=False)
        worksheet = writer.sheets["IASP Report"]
        worksheet.freeze_panes(1, 0)
        worksheet.autofilter(0, 0, max(len(iasp_df), 1), max(len(iasp_df.columns) - 1, 0))
        
        # Auto-fit column widths
        for col_idx, col_name in enumerate(iasp_df.columns):
            max_len = max(iasp_df[col_name].astype(str).map(len).max() if not iasp_df.empty else 10, len(col_name)) + 3
            if col_name in ("Threat", "Impact", "Recommendation", "Exploitability", "Results"):
                worksheet.set_column(col_idx, col_idx, min(max_len, 45), wrap_fmt)
            else:
                worksheet.set_column(col_idx, col_idx, min(max_len, 30), text_fmt)
                
        # 2. Supporting Sheets
        sheets_data = [
            ("Processing Summary", pd.DataFrame(list(results.get("summary", {}).items()), columns=["Metric", "Value"])),
            ("Data Quality Log", results.get("data_quality_df", pd.DataFrame())),
            ("Unmatched Qualys Findings", results.get("unmatched_df", pd.DataFrame())),
            ("Non-Running Assets", results.get("non_running_df", pd.DataFrame())),
            ("Ambiguous Cloud Matches", results.get("ambiguous_df", pd.DataFrame())),
            ("Excluded Severity 1 and 2", pd.concat([results.get("sev1_excluded_df", pd.DataFrame()), results.get("sev2_excluded_df", pd.DataFrame())], ignore_index=True)),
            ("Invalid Records", results.get("invalid_records_df", pd.DataFrame())),
            ("Duplicate Records", results.get("duplicate_records_df", pd.DataFrame())),
        ]
        
        for name, df_item in sheets_data:
            df_item.to_excel(writer, sheet_name=name[:31], index=False)
            ws = writer.sheets[name[:31]]
            ws.freeze_panes(1, 0)
            
    output.seek(0)
    return output.getvalue()

def export_powerbi_workbook(
    results: dict,
    config: ToolConfig
) -> bytes:
    """
    Generates PowerBI_Qualys_Report_YYYYMMDD_HHMMSS.xlsx with complete Power BI data and Quality logs.
    """
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        workbook = writer.book
        
        # 1. Main Power BI Data Sheet
        powerbi_df = results.get("powerbi_df", pd.DataFrame())
        powerbi_df.to_excel(writer, sheet_name="PowerBI Data", index=False)
        worksheet = writer.sheets["PowerBI Data"]
        worksheet.freeze_panes(1, 0)
        worksheet.autofilter(0, 0, max(len(powerbi_df), 1), max(len(powerbi_df.columns) - 1, 0))
        
        # 2. Supporting sheets
        results.get("data_quality_df", pd.DataFrame()).to_excel(writer, sheet_name="Data Quality Log", index=False)
        pd.DataFrame(list(results.get("summary", {}).items()), columns=["Metric", "Value"]).to_excel(writer, sheet_name="Processing Summary", index=False)
        
    output.seek(0)
    return output.getvalue()
