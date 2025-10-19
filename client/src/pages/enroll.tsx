import React, { useEffect } from "react";

// Prefer the EXE installer for zero-click UX. If EXE isn't available the page will
// fall back to the raw PowerShell script download.
// Use the built installer in static/installers. Currently dev builds are suffixed with -dev.
// For production rename the built EXE to itam-agent-win.exe.
const WINDOWS_INSTALLER_EXE = "/static/installers/itam-agent-win-dev.exe";
const WINDOWS_AGENT_POWERSHELL = "/build/win/files/oa_agent_advanced.ps1";

function isWindows() {
	if (typeof navigator !== "undefined") {
		return navigator.userAgent.includes("Windows");
	}
	return false;
}

function triggerWindowsAgent() {
	// Try to download the EXE installer first (better UX). If EXE 404s, fall back
	// to the PowerShell script. We try EXE by creating a fetch request to see if
	// it's available, then trigger a download link.
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
			// On any error, fallback to the PS1
			const link = document.createElement("a");
			link.href = WINDOWS_AGENT_POWERSHELL;
			link.download = "oa_agent_advanced.ps1";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		});
}

const Enroll: React.FC = () => {
	useEffect(() => {
		if (isWindows()) {
			triggerWindowsAgent();
		}
	}, []);

	return (
		<div className="enroll-page">
			<h1>Device Enrollment</h1>
			<p>
				{isWindows()
					? "Your Windows device is being enrolled automatically. If prompted, please allow the agent to run."
					: "Please follow the instructions for your device type."}
			</p>
			{isWindows() && (
				<div>
					<p>
									If the agent did not run automatically, <a href={WINDOWS_INSTALLER_EXE}>download the Windows installer</a> (preferred) or <a href={WINDOWS_AGENT_POWERSHELL} download>download the PowerShell script</a>.
								</p>
								<p>
									After downloading the EXE, double-click it to run the installer (it runs as Administrator). If you downloaded the PowerShell script, right-click and select 'Run with PowerShell (Admin)'.
					</p>
				</div>
			)}
		</div>
	);
};

export default Enroll;
