import os
import sys
import pycdlib

def create_dmg_from_app():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_app = os.path.join(project_root, 'dist', 'mac', 'LedgerX.app')
    out_dmg = os.path.join(project_root, 'public', 'downloads', 'LedgerX-Setup.dmg')

    if not os.path.exists(src_app):
        print(f"Error: {src_app} does not exist. Run build-macos-installer.js first.")
        sys.exit(1)

    os.makedirs(os.path.dirname(out_dmg), exist_ok=True)

    print("Building LedgerX macOS Mountable Disk Image (.dmg)...")
    iso = pycdlib.PyCdlib()
    iso.new(interchange_level=3, rock_ridge='1.09', joliet=3, vol_ident='LedgerX')

    # Root application directory
    iso.add_directory('/LEDGERX', rr_name='LedgerX.app', joliet_path='/LedgerX.app')

    # Walk through dist/mac/LedgerX.app and add all directories and files
    dir_mapping = { '': '/LEDGERX' }
    joliet_mapping = { '': '/LedgerX.app' }

    dir_counter = 1
    file_counter = 1

    for root, dirs, files in os.walk(src_app):
        rel_root = os.path.relpath(root, src_app)
        if rel_root == '.':
            rel_root = ''

        parent_iso = dir_mapping[rel_root]
        parent_joliet = joliet_mapping[rel_root]

        for d in dirs:
            rel_dir = os.path.join(rel_root, d) if rel_root else d
            iso_dname = f"{parent_iso}/D{dir_counter}"
            joliet_dname = f"{parent_joliet}/{d}"
            dir_counter += 1

            dir_mapping[rel_dir] = iso_dname
            joliet_mapping[rel_dir] = joliet_dname

            iso.add_directory(iso_dname, rr_name=d, joliet_path=joliet_dname)

        for f in files:
            file_path = os.path.join(root, f)
            iso_fname = f"{parent_iso}/F{file_counter}"
            joliet_fname = f"{parent_joliet}/{f}"
            file_counter += 1

            iso.add_file(file_path, iso_fname, rr_name=f, joliet_path=joliet_fname)

    # Add Drag-to-Applications instruction text file in the root
    install_guide = (
        "LedgerX Desktop for macOS (Apple Silicon & Intel)\n"
        "=================================================\n\n"
        "INSTALLATION INSTRUCTIONS:\n"
        "1. Drag 'LedgerX.app' into your Mac's 'Applications' folder.\n"
        "2. Open Applications and double-click 'LedgerX' to launch.\n"
        "3. Enter your License Key once to activate 100% offline access.\n\n"
        "Features:\n"
        "- Full Offline Accounting & Tally-style Multi-Company Storage\n"
        "- POS Counter, Thermal Slip Printing, and Barcode Scanning\n"
        "- Multi-User LAN Client / Host Connectivity on Port 45454\n"
        "- 100% Feature Parity with Windows Edition\n\n"
        "Support: support@ledgerxerp.com | https://www.ledgerxerp.com\n"
    ).encode('utf-8')

    guide_path = os.path.join(project_root, 'dist', 'mac', 'README.txt')
    with open(guide_path, 'wb') as g:
        g.write(install_guide)

    iso.add_file(guide_path, '/README.TXT', rr_name='ReadMe.txt', joliet_path='/ReadMe.txt')

    if os.path.exists(out_dmg):
        os.remove(out_dmg)

    iso.write(out_dmg)
    iso.close()

    size_mb = os.path.getsize(out_dmg) / (1024 * 1024)
    print(f"Successfully generated macOS Disk Image: {out_dmg} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    create_dmg_from_app()
