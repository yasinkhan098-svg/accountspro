import os
import sys
import pycdlib

def build_single_dmg(src_app_folder, app_bundle_name, output_dmg_path, volume_name, readme_content=None):
    if not os.path.exists(src_app_folder):
        print(f"Skipping {volume_name}: {src_app_folder} does not exist.")
        return

    os.makedirs(os.path.dirname(output_dmg_path), exist_ok=True)
    print(f"Generating DMG: {output_dmg_path} (Volume: {volume_name})...")

    iso = pycdlib.PyCdlib()
    vol_ident = ''.join(c for c in volume_name if c.isalnum() or c == '_').upper()[:32]
    iso.new(interchange_level=3, rock_ridge='1.09', joliet=3, vol_ident=vol_ident)

    clean_tag = ''.join(c for c in volume_name if c.isalnum() or c == '_').upper()[:8]
    if not clean_tag:
        clean_tag = "APP"
    iso_root_name = f"/{clean_tag}"
    joliet_root_name = f"/{app_bundle_name}"

    iso.add_directory(iso_root_name, rr_name=app_bundle_name, joliet_path=joliet_root_name)

    dir_mapping = { '': iso_root_name }
    joliet_mapping = { '': joliet_root_name }

    dir_counter = 1
    file_counter = 1

    for root, dirs, files in os.walk(src_app_folder):
        rel_root = os.path.relpath(root, src_app_folder)
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

    # Optional README in root of DMG
    if readme_content:
        temp_readme = os.path.join(os.path.dirname(output_dmg_path), f"temp_readme_{volume_name}.txt")
        with open(temp_readme, 'wb') as g:
            g.write(readme_content.encode('utf-8'))
        iso.add_file(temp_readme, '/README.TXT', rr_name='ReadMe.txt', joliet_path='/ReadMe.txt')

    if os.path.exists(output_dmg_path):
        os.remove(output_dmg_path)

    iso.write(output_dmg_path)
    iso.close()

    if readme_content and os.path.exists(temp_readme):
        os.remove(temp_readme)

    size_mb = os.path.getsize(output_dmg_path) / (1024 * 1024)
    print(f"✓ Done: {output_dmg_path} ({size_mb:.2f} MB)")

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    downloads = os.path.join(project_root, 'public', 'downloads')

    # 1. Main Host & Standalone DMG
    main_app = os.path.join(project_root, 'dist', 'mac', 'LedgerX.app')
    main_dmg = os.path.join(downloads, 'LedgerX-Setup.dmg')
    build_single_dmg(
        main_app,
        'LedgerX.app',
        main_dmg,
        'LedgerX',
        "LedgerX Desktop for macOS\nDrag LedgerX.app into Applications to install."
    )

    # 2. Offline LAN Client DMG
    lan_app = os.path.join(project_root, 'dist', 'mac-client', 'LedgerX Client.app')
    lan_dmg = os.path.join(downloads, 'LedgerX-Client-Setup.dmg')
    build_single_dmg(
        lan_app,
        'LedgerX Client.app',
        lan_dmg,
        'LedgerX-Client',
        "LedgerX LAN Client for macOS\nDrag LedgerX Client.app into Applications.\nAuto-connects to Host PC on Port 45454."
    )

    # 3. Online Cloud Client DMG
    cloud_app = os.path.join(project_root, 'dist', 'mac-cloud-client', 'LedgerX Cloud Client.app')
    cloud_dmg = os.path.join(downloads, 'LedgerX-Online-Client.dmg')
    build_single_dmg(
        cloud_app,
        'LedgerX Cloud Client.app',
        cloud_dmg,
        'LedgerX-Cloud',
        "LedgerX Online Cloud Client for macOS\nDrag LedgerX Cloud Client.app into Applications."
    )

if __name__ == '__main__':
    main()
