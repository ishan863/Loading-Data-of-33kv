# PowerShell script to replace Upload Tab with Excel Upload + Preview workflow
$ErrorActionPreference = "Stop"

Write-Host "Reading index.html..." -ForegroundColor Cyan
$content = Get-Content "public\index.html" -Raw -Encoding UTF8

Write-Host "Finding Upload Tab section..." -ForegroundColor Cyan
$startMarker = '<div id="uploadTab" class="admin-tab-content">'
$endMarker = '<div id="viewTab" class="admin-tab-content">'

$startIndex = $content.IndexOf($startMarker)
$endIndex = $content.IndexOf($endMarker)

if ($startIndex -eq -1 -or $endIndex -eq -1) {
    Write-Host "ERROR: Could not find Upload Tab or View Tab sections!" -ForegroundColor Red
    exit 1
}

Write-Host "Found sections. Extracting old content..." -ForegroundColor Cyan
$beforeUpload = $content.Substring(0, $startIndex)
$afterUpload = $content.Substring($endIndex)

Write-Host "Inserting new Upload Tab HTML with Excel Preview..." -ForegroundColor Cyan
$newUploadTab = @'
<div id="uploadTab" class="admin-tab-content">
                <h2>📤 Upload & Verify Data</h2>
                
                <!-- Upload Section -->
                <div class="upload-section">
                    <div class="upload-card">
                        <h3>📥 Upload Excel File</h3>
                        <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">Upload your Excel file - Preview and verify changes before saving to Firebase</p>
                        
                        <input type="file" id="excelPreviewInput" accept=".xlsx,.xls,.csv" style="display: none;">
                        <button class="btn-primary" onclick="document.getElementById('excelPreviewInput').click()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 14px 32px; font-size: 16px;">
                            📁 Choose Excel File to Upload
                        </button>
                        
                        <div id="excelUploadStatus" style="margin-top: 1rem; color: white; font-weight: 600;"></div>
                        
                        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px;">
                            <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin: 0 0 0.5rem 0; font-weight: 600;">✅ Upload Workflow:</p>
                            <ul style="font-size: 11px; color: rgba(255,255,255,0.7); margin: 0; padding-left: 1.5rem;">
                                <li><strong>Step 1:</strong> Choose your Excel file (PSS Stations, Users, or Daily Data)</li>
                                <li><strong>Step 2:</strong> Preview data in editable table below</li>
                                <li><strong>Step 3:</strong> Verify and edit if needed (changes highlighted in yellow)</li>
                                <li><strong>Step 4:</strong> Click "Save to Firebase" to confirm</li>
                                <li>Empty cells keep existing data (no deletion)</li>
                                <li>Date format: <strong>dd-mm-yyyy</strong></li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Preview Table Container -->
                    <div id="previewTableContainer" style="display: none; margin-top: 2rem;">
                        <div class="upload-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div>
                                    <h3>📊 Preview & Verify Data</h3>
                                    <p style="color: rgba(255,255,255,0.7); margin: 0.5rem 0 0 0; font-size: 13px;">
                                        <span id="previewDataType" style="color: #10b981; font-weight: 600;"></span> - 
                                        <span id="previewRecordCount" style="color: #3b82f6;"></span> records loaded
                                    </p>
                                </div>
                                <div style="display: flex; gap: 1rem;">
                                    <button class="btn-primary" onclick="cancelPreview()" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                                        ❌ Cancel
                                    </button>
                                    <button class="btn-primary" onclick="savePreviewData()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px 32px; font-size: 15px; font-weight: 700;">
                                        ✅ Save to Firebase
                                    </button>
                                </div>
                            </div>
                            
                            <div style="max-height: 500px; overflow: auto; background: rgba(30,41,59,0.6); border-radius: 12px; padding: 1rem;">
                                <table id="previewTable" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead id="previewTableHead" style="position: sticky; top: 0; background: rgba(30,41,59,0.95); z-index: 10;">
                                        <!-- Headers will be populated dynamically -->
                                    </thead>
                                    <tbody id="previewTableBody">
                                        <!-- Rows will be populated dynamically -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="margin-top: 1rem; padding: 1rem; background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px;">
                                <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin: 0; font-weight: 600;">
                                    ℹ️ You can edit cells directly in the table. Modified cells will be highlighted in yellow.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .preview-cell {
                        padding: 8px;
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(168,85,247,0.2);
                        border-radius: 6px;
                        color: white;
                        width: 100%;
                        font-family: inherit;
                        transition: all 0.3s ease;
                        font-size: 12px;
                    }
                    
                    .preview-cell:focus {
                        background: rgba(255,255,255,0.15);
                        border-color: rgba(168,85,247,0.6);
                        outline: none;
                    }
                    
                    .preview-cell.modified {
                        background: rgba(251,191,36,0.3) !important;
                        border-color: rgba(251,191,36,0.8) !important;
                        font-weight: 600;
                    }
                    
                    .preview-row-modified {
                        background: rgba(251,191,36,0.05);
                    }
                </style>
            </div>

            
'@

# Combine the parts
$newContent = $beforeUpload + $newUploadTab + $afterUpload

Write-Host "Writing updated index.html..." -ForegroundColor Cyan
Set-Content "public\index.html" -Value $newContent -Encoding UTF8 -NoNewline

Write-Host "`n✅ SUCCESS! Upload Tab updated with Excel Preview workflow!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Refresh browser with Ctrl+F5" -ForegroundColor White
Write-Host "2. Upload Excel file" -ForegroundColor White
Write-Host "3. Preview and verify data in table" -ForegroundColor White
Write-Host "4. Edit if needed (cells turn yellow)" -ForegroundColor White
Write-Host "5. Click 'Save to Firebase'" -ForegroundColor White
