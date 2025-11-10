# Linux SNMP Discovery Scanner

## Overview
This bash-based scanner discovers network devices using SNMP and port fingerprinting on Linux.

## Building Options

### Method 1: AppImage (Recommended - Universal Linux)
```bash
# Install appimagetool
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage

# Create AppDir structure
mkdir -p ITAMDiscovery.AppDir/usr/bin
mkdir -p ITAMDiscovery.AppDir/usr/share/applications
mkdir -p ITAMDiscovery.AppDir/usr/share/icons/hicolor/256x256/apps

# Copy scanner script
cp itam-discovery.sh ITAMDiscovery.AppDir/usr/bin/itam-discovery
chmod +x ITAMDiscovery.AppDir/usr/bin/itam-discovery

# Create AppRun launcher
cat > ITAMDiscovery.AppDir/AppRun <<'EOF'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"

# Open terminal and run scanner
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- "${HERE}/usr/bin/itam-discovery"
elif command -v xterm &> /dev/null; then
    xterm -e "${HERE}/usr/bin/itam-discovery"
elif command -v konsole &> /dev/null; then
    konsole -e "${HERE}/usr/bin/itam-discovery"
else
    "${HERE}/usr/bin/itam-discovery"
fi
EOF
chmod +x ITAMDiscovery.AppDir/AppRun

# Create desktop entry
cat > ITAMDiscovery.AppDir/itam-discovery.desktop <<EOF
[Desktop Entry]
Name=ITAM Discovery
Exec=itam-discovery
Icon=itam-discovery
Type=Application
Categories=Network;System;
Terminal=true
EOF

# Create icon (placeholder)
echo "Add icon: ITAMDiscovery.AppDir/itam-discovery.png"

# Build AppImage
./appimagetool-x86_64.AppImage ITAMDiscovery.AppDir itam-discovery-linux.AppImage
chmod +x itam-discovery-linux.AppImage
```

### Method 2: DEB Package (Debian/Ubuntu)
```bash
# Create package structure
mkdir -p itam-discovery_1.0.0/DEBIAN
mkdir -p itam-discovery_1.0.0/usr/local/bin
mkdir -p itam-discovery_1.0.0/usr/share/applications
mkdir -p itam-discovery_1.0.0/usr/share/icons/hicolor/256x256/apps

# Copy scanner
cp itam-discovery.sh itam-discovery_1.0.0/usr/local/bin/itam-discovery
chmod +x itam-discovery_1.0.0/usr/local/bin/itam-discovery

# Create control file
cat > itam-discovery_1.0.0/DEBIAN/control <<EOF
Package: itam-discovery
Version: 1.0.0
Section: net
Priority: optional
Architecture: all
Depends: snmp, jq, curl
Maintainer: ITAM Team <admin@example.com>
Description: ITAM Network Discovery Scanner
 Discovers network devices using SNMP and port fingerprinting.
EOF

# Create postinst script
cat > itam-discovery_1.0.0/DEBIAN/postinst <<'EOF'
#!/bin/bash
set -e
echo "ITAM Discovery Scanner installed successfully!"
echo "Run 'itam-discovery' from terminal or use the desktop shortcut."
chmod +x /usr/local/bin/itam-discovery
EOF
chmod +x itam-discovery_1.0.0/DEBIAN/postinst

# Create desktop entry
cat > itam-discovery_1.0.0/usr/share/applications/itam-discovery.desktop <<EOF
[Desktop Entry]
Name=ITAM Discovery
Comment=Network Device Discovery Scanner
Exec=gnome-terminal -- itam-discovery
Icon=itam-discovery
Type=Application
Categories=Network;System;
Terminal=true
EOF

# Build DEB package
dpkg-deb --build itam-discovery_1.0.0
mv itam-discovery_1.0.0.deb itam-discovery-linux.deb

# Install
sudo dpkg -i itam-discovery-linux.deb
```

### Method 3: RPM Package (RHEL/CentOS/Fedora)
```bash
# Install rpm-build
sudo yum install rpm-build

# Create RPM structure
mkdir -p ~/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Create spec file
cat > ~/rpmbuild/SPECS/itam-discovery.spec <<EOF
Name:           itam-discovery
Version:        1.0.0
Release:        1%{?dist}
Summary:        ITAM Network Discovery Scanner

License:        MIT
URL:            https://example.com
Source0:        %{name}-%{version}.tar.gz

Requires:       net-snmp-utils, jq, curl

%description
ITAM Network Discovery Scanner discovers network devices using SNMP.

%prep
%setup -q

%install
mkdir -p %{buildroot}/%{_bindir}
install -m 0755 itam-discovery.sh %{buildroot}/%{_bindir}/itam-discovery

%files
%{_bindir}/itam-discovery

%changelog
* $(date +"%a %b %d %Y") Your Name <email@example.com> - 1.0.0-1
- Initial package
EOF

# Create source tarball
tar czf ~/rpmbuild/SOURCES/itam-discovery-1.0.0.tar.gz itam-discovery.sh

# Build RPM
rpmbuild -ba ~/rpmbuild/SPECS/itam-discovery.spec

# Result: ~/rpmbuild/RPMS/noarch/itam-discovery-1.0.0-1.noarch.rpm
```

### Method 4: Flatpak (Sandboxed)
```bash
# Install flatpak-builder
sudo apt install flatpak-builder

# Create manifest
cat > com.itam.Discovery.yml <<EOF
app-id: com.itam.Discovery
runtime: org.freedesktop.Platform
runtime-version: '22.08'
sdk: org.freedesktop.Sdk
command: itam-discovery
finish-args:
  - --share=network
  - --device=all
modules:
  - name: itam-discovery
    buildsystem: simple
    build-commands:
      - install -D itam-discovery.sh /app/bin/itam-discovery
    sources:
      - type: file
        path: itam-discovery.sh
EOF

# Build Flatpak
flatpak-builder --force-clean build-dir com.itam.Discovery.yml
flatpak-builder --repo=repo --force-clean build-dir com.itam.Discovery.yml

# Create bundle
flatpak build-bundle repo itam-discovery-linux.flatpak com.itam.Discovery
```

## Prerequisites
```bash
# Debian/Ubuntu
sudo apt-get install snmp jq curl nmap

# RHEL/CentOS/Fedora
sudo yum install net-snmp-utils jq curl nmap

# Arch Linux
sudo pacman -S net-snmp jq curl nmap

# OpenSUSE
sudo zypper install net-snmp jq curl nmap
```

## Configuration
The scanner reads configuration from `config.json`:
```json
{
  "jobId": "ABC12345",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "https://your-server.com"
}
```

## Usage

### AppImage
```bash
chmod +x itam-discovery-linux.AppImage
./itam-discovery-linux.AppImage
```

### DEB Package
```bash
sudo dpkg -i itam-discovery-linux.deb
itam-discovery  # Run from anywhere
```

### RPM Package
```bash
sudo rpm -i itam-discovery-linux.rpm
itam-discovery
```

### Direct Script
```bash
chmod +x itam-discovery.sh
sudo ./itam-discovery.sh
```

## Features
- **Auto-detection**: Automatically finds network ranges
- **SNMPv2c scanning**: Tries common community strings
- **Port fingerprinting**: Identifies devices by open ports
- **MAC address detection**: Uses ARP cache
- **Multi-threaded**: Parallel scanning (50 concurrent)
- **Batch uploads**: Efficient result transmission
- **Device classification**: Identifies printers, servers, network devices

## Troubleshooting

### "Permission Denied"
```bash
chmod +x itam-discovery.sh
sudo ./itam-discovery.sh  # Some operations need root
```

### "Command Not Found"
```bash
# Add to PATH
export PATH=$PATH:/usr/local/bin

# Or create symlink
sudo ln -s /path/to/itam-discovery.sh /usr/local/bin/itam-discovery
```

### SNMP Not Working
```bash
# Test SNMP connectivity
snmpget -v2c -c public <target_ip> 1.3.6.1.2.1.1.1.0

# Check firewall
sudo ufw allow 161/udp  # Ubuntu/Debian
sudo firewall-cmd --add-port=161/udp --permanent  # RHEL/CentOS
```

### Dependencies Installation Failed
```bash
# Manual installation
sudo apt-get update
sudo apt-get install snmp snmp-mibs-downloader jq curl nmap

# Enable MIBs
sudo sed -i 's/^mibs :$/# mibs :/' /etc/snmp/snmp.conf
```

## Desktop Integration

### Create .desktop File
```bash
cat > ~/.local/share/applications/itam-discovery.desktop <<EOF
[Desktop Entry]
Name=ITAM Discovery
Comment=Network Device Discovery Scanner
Exec=gnome-terminal -- /path/to/itam-discovery.sh
Icon=network-workgroup
Type=Application
Categories=Network;System;
Terminal=true
EOF

chmod +x ~/.local/share/applications/itam-discovery.desktop
update-desktop-database ~/.local/share/applications
```

## Security Notes
- Requires root privileges for some network operations
- Token is short-lived (30 minutes)
- No sensitive credentials stored locally
- Results sent over HTTPS
- Only scans local subnet by default
