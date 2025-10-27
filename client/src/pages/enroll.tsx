import React, { useEffect } from "react";

// Installer URLs
const WINDOWS_INSTALLER_EXE = "/static/installers/itam-agent-win.exe";
const WINDOWS_AGENT_POWERSHELL = "/build/win/files/oa_agent_advanced.ps1";
const LINUX_INSTALLER = "/enroll/linux-installer";
const LINUX_GUI_INSTALLER = "/static/installers/itam-agent-linux-gui.sh";

function isWindows() {
	if (typeof navigator !== "undefined") {
		return navigator.userAgent.includes("Windows");
	}
	return false;
}

function isLinux() {
	if (typeof navigator !== "undefined") {
		const ua = navigator.userAgent;
		return ua.includes("Linux") && !ua.includes("Android");
	}
	return false;
}

function triggerWindowsAgent() {
	fetch(WINDOWS_INSTALLER_EXE, { method: "HEAD" })
		.then((res) => {
			const url = res.ok ? WINDOWS_INSTALLER_EXE : WINDOWS_AGENT_POWERSHELL;
			const filename = res.ok ? "itam-agent-win.exe" : "oa_agent_advanced.ps1";
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		})
		.catch(() => {
			const link = document.createElement("a");
			link.href = WINDOWS_AGENT_POWERSHELL;
			link.download = "oa_agent_advanced.ps1";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		});
}

function triggerLinuxAgent() {
	// Navigate directly to the download URL
	// This will download the bash installer which auto-launches terminal
	window.location.href = LINUX_INSTALLER;
}

const Enroll: React.FC = () => {
	const isWin = isWindows();
	const isLinuxOS = isLinux();

	useEffect(() => {
		if (isWin) {
			triggerWindowsAgent();
		} else if (isLinuxOS) {
			triggerLinuxAgent();
		}
	}, [isWin, isLinuxOS]);

	return (
		<div className="enroll-page" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
			<h1>Device Enrollment</h1>
			<p>
				{isWin
					? "Your Windows installer is downloading..."
					: isLinuxOS
					? "Your Linux installer has been downloaded."
					: "Please visit this page from the device you want to enroll."}
			</p>
			
			{isWin && (
				<div>
					<h3>Windows Installation Steps:</h3>
					<ol>
						<li>Locate the downloaded file in your Downloads folder</li>
						<li>Double-click <code>itam-agent-win.exe</code> to run</li>
						<li>Click "Yes" when prompted for administrator access</li>
						<li>Wait for installation to complete</li>
					</ol>
					<p>
						<strong>Alternative download:</strong>{" "}
						<a href={WINDOWS_INSTALLER_EXE}>Windows Installer (.exe)</a> or{" "}
						<a href={WINDOWS_AGENT_POWERSHELL} download>PowerShell Script (.ps1)</a>
					</p>
				</div>
			)}
			
			{isLinuxOS && (
				<div>
					<div style={{ backgroundColor: "#e3f2fd", padding: "2rem", borderRadius: "12px", marginTop: "1.5rem", border: "3px solid #1976d2" }}>
						<h2 style={{ marginTop: 0, color: "#0d47a1", fontSize: "1.5em" }}>📋 Register Your Linux Device</h2>
						<p style={{ fontSize: "1.15em", marginBottom: "1.5rem", lineHeight: "1.6" }}>
							The audit script has been downloaded. Run this command in your terminal to register your device:
						</p>
						<div style={{ position: "relative" }}>
							<code id="linuxInstallCmd" style={{ 
								display: "block", 
								padding: "1.25rem", 
								backgroundColor: "#263238", 
								color: "#aed581",
								borderRadius: "8px",
								border: "2px solid #1976d2",
								fontFamily: "'Courier New', monospace",
								fontSize: "15px",
								userSelect: "all",
								marginTop: "0.5rem",
								fontWeight: "500",
								boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
							}}>
								cd ~/Downloads && sudo bash audit_linux.sh
							</code>
							<button 
								onClick={() => {
									const cmd = document.getElementById('linuxInstallCmd')?.textContent || '';
									navigator.clipboard.writeText(cmd).then(() => {
										const btn = document.activeElement as HTMLButtonElement;
										const originalText = btn.textContent;
										btn.textContent = '✅ Copied!';
										setTimeout(() => { btn.textContent = originalText || '📋 Copy Command'; }, 2000);
									});
								}}
								style={{
									marginTop: "1rem",
									padding: "1rem 2rem",
									backgroundColor: "#1976d2",
									color: "white",
									border: "none",
									borderRadius: "8px",
									cursor: "pointer",
									fontSize: "16px",
									fontWeight: "600",
									boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
									transition: "all 0.3s"
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "#1565c0";
									e.currentTarget.style.transform = "translateY(-2px)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "#1976d2";
									e.currentTarget.style.transform = "translateY(0)";
								}}
							>
								📋 Copy Command
							</button>
						</div>
					</div>
					
					<div style={{ marginTop: "1.5rem", padding: "1.25rem", backgroundColor: "#f5f5f5", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
						<h4 style={{ marginTop: 0, marginBottom: "0.75rem" }}>ℹ️ What happens:</h4>
						<ol style={{ marginLeft: "1.5rem", marginBottom: 0, lineHeight: "1.8" }}>
							<li>The script collects your device's hardware and software information</li>
							<li>Your device is automatically registered in the ITAM system</li>
							<li>You can view and manage your device in the Assets dashboard</li>
							<li>Asset information updates automatically</li>
						</ol>
					</div>
				</div>
			)}
			
			{!isWin && !isLinuxOS && (
				<div>
					<h3>Supported Platforms:</h3>
					<ul>
						<li><a href="/enroll?os=win">Windows</a> - Automatic installation via .exe installer</li>
						<li><a href="/enroll?os=linux">Linux</a> - Terminal command installation</li>
						<li><a href="/enroll?os=mac">macOS</a> - .pkg installer (coming soon)</li>
					</ul>
				</div>
			)}
		</div>
	);
};

export default Enroll;
