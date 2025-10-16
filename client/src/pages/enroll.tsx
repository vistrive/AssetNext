import React, { useEffect } from "react";

const WINDOWS_AGENT_URL = "/build/win/files/oa_agent_advanced.ps1";

function isWindows() {
	if (typeof navigator !== "undefined") {
		return navigator.userAgent.includes("Windows");
	}
	return false;
}

function triggerWindowsAgent() {
	// Create a hidden link to download the agent script
	const link = document.createElement("a");
	link.href = WINDOWS_AGENT_URL;
	link.download = "oa_agent_advanced.ps1";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
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
						If the agent did not run automatically, <a href={WINDOWS_AGENT_URL} download>click here</a> to download the Windows agent script.
					</p>
					<p>
						After download, right-click the file and select 'Run with PowerShell' as administrator.
					</p>
				</div>
			)}
		</div>
	);
};

export default Enroll;
