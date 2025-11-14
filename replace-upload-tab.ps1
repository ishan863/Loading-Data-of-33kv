# PowerShell script to replace Upload Tab HTML
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

Write-Host "Inserting new Upload Tab HTML..." -ForegroundColor Cyan
$newUploadTab = @'
<div id="uploadTab" class="admin-tab-content">
                <h2>📤 Upload & Edit Backend Data</h2>
                
                <!-- Tab Selection for Different Data Types -->
                <div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid rgba(168,85,247,0.3); padding-bottom: 1rem;">
                    <button class="data-type-tab active" data-type="pss-admin" onclick="switchDataType('pss-admin')">
                        📋 PSS Admin Data
                    </button>
                    <button class="data-type-tab" data-type="pss-details" onclick="switchDataType('pss-details')">
                        📊 PSS Details (Lineman/Helper)
                    </button>
                </div>
                
                <!-- PSS Admin Data Section -->
                <div id="pss-admin-section" class="data-section active">
                    <div class="upload-section">
                        <div class="upload-card">
                            <h3>📥 PSS Admin Contact Data</h3>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1rem;">Load, edit inline, and save PSS admin names and phone numbers</p>
                            
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                                <button class="btn-primary" onclick="loadPSSAdminData()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                    📥 Load PSS Admin Data
                                </button>
                                <button class="btn-primary" onclick="downloadPSSAdminCSV()" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                                    💾 Download as Excel
                                </button>
                                <button class="btn-primary" onclick="savePSSAdminChanges()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                    ✅ Save Changes to Backend
                                </button>
                            </div>
                            
                            <!-- Editable Table -->
                            <div id="pss-admin-table-container" style="display: none; max-height: 500px; overflow: auto; background: rgba(30,41,59,0.6); border-radius: 12px; padding: 1rem;">
                                <table id="pss-admin-table" style="width: 100%; border-collapse: collapse;">
                                    <thead style="position: sticky; top: 0; background: rgba(30,41,59,0.95); z-index: 10;">
                                        <tr>
                                            <th style="padding: 12px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa; text-align: left;">PSS Name</th>
                                            <th style="padding: 12px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa; text-align: left;">Phone Number</th>
                                            <th style="padding: 12px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa; text-align: center;">Modified</th>
                                        </tr>
                                    </thead>
                                    <tbody id="pss-admin-tbody">
                                        <!-- Rows will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <div id="pss-admin-status" style="margin-top: 1rem; padding: 1rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; display: none;">
                                <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin: 0; font-weight: 600;">ℹ️ Inline Editing: Click any cell to edit. Changes are highlighted in yellow.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- PSS Details Section -->
                <div id="pss-details-section" class="data-section" style="display: none;">
                    <div class="upload-section">
                        <div class="upload-card">
                            <h3>📊 PSS Details (Lineman & Helper)</h3>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1rem;">Load, edit inline, and save PSS lineman and helper information</p>
                            
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                                <button class="btn-primary" onclick="loadPSSDetailsData()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                    📥 Load PSS Details
                                </button>
                                <button class="btn-primary" onclick="downloadPSSDetailsCSV()" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                                    💾 Download as Excel
                                </button>
                                <button class="btn-primary" onclick="savePSSDetailsChanges()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                    ✅ Save Changes to Backend
                                </button>
                            </div>
                            
                            <!-- Editable Table -->
                            <div id="pss-details-table-container" style="display: none; max-height: 500px; overflow: auto; background: rgba(30,41,59,0.6); border-radius: 12px; padding: 1rem;">
                                <table id="pss-details-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead style="position: sticky; top: 0; background: rgba(30,41,59,0.95); z-index: 10;">
                                        <tr>
                                            <th style="padding: 10px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa;">PSS NAME</th>
                                            <th style="padding: 10px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa;">FEEDERS</th>
                                            <th style="padding: 10px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa;">LINEMAN</th>
                                            <th style="padding: 10px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa;">HELPER</th>
                                            <th style="padding: 10px; border: 1px solid rgba(168,85,247,0.3); color: #a78bfa; text-align: center;">Modified</th>
                                        </tr>
                                    </thead>
                                    <tbody id="pss-details-tbody">
                                        <!-- Rows will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <div id="pss-details-status" style="margin-top: 1rem; padding: 1rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; display: none;">
                                <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin: 0; font-weight: 600;">ℹ️ Inline Editing: Click any cell to edit. Changes are highlighted in yellow.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .data-type-tab {
                        padding: 12px 24px;
                        background: rgba(168,85,247,0.15);
                        border: 2px solid rgba(168,85,247,0.3);
                        border-radius: 10px;
                        color: rgba(255,255,255,0.7);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-weight: 600;
                    }
                    
                    .data-type-tab:hover {
                        background: rgba(168,85,247,0.25);
                        border-color: rgba(168,85,247,0.5);
                    }
                    
                    .data-type-tab.active {
                        background: rgba(168,85,247,0.4);
                        border-color: rgba(168,85,247,0.8);
                        color: white;
                    }
                    
                    .data-section {
                        display: none;
                    }
                    
                    .data-section.active {
                        display: block;
                    }
                    
                    .editable-cell {
                        padding: 8px;
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(168,85,247,0.2);
                        border-radius: 6px;
                        color: white;
                        width: 100%;
                        font-family: inherit;
                        transition: all 0.3s ease;
                    }
                    
                    .editable-cell:focus {
                        background: rgba(255,255,255,0.15);
                        border-color: rgba(168,85,247,0.6);
                        outline: none;
                    }
                    
                    .editable-cell.modified {
                        background: rgba(251,191,36,0.3);
                        border-color: rgba(251,191,36,0.8);
                    }
                    
                    .row-modified {
                        background: rgba(251,191,36,0.05);
                    }
                    
                    td.modified-marker {
                        text-align: center;
                        font-size: 18px;
                    }
                </style>
            </div>

            
'@

# Combine the parts
$newContent = $beforeUpload + $newUploadTab + $afterUpload

Write-Host "Writing updated index.html..." -ForegroundColor Cyan
Set-Content "public\index.html" -Value $newContent -Encoding UTF8 -NoNewline

Write-Host "`n✅ SUCCESS! Upload Tab HTML has been replaced!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Refresh your browser with Ctrl+F5" -ForegroundColor White
Write-Host "2. Go to Upload Data tab" -ForegroundColor White
Write-Host "3. You should see two tabs: 'PSS Admin Data' and 'PSS Details'" -ForegroundColor White
Write-Host "4. Click 'Load PSS Admin Data' to test" -ForegroundColor White
Write-Host "`nBackup saved at: public\index.html.backup" -ForegroundColor Cyan
