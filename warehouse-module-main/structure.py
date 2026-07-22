import os
from pathlib import Path

# Define the file structure as a nested dictionary
# Keys are folder names, lists represent files
file_structure = {
    ".lovable": ["project.json"],
    "deliverables": {
        "backend": {
            "src": {
                "db": ["pool.js"],
                "middleware": ["auth.js", "error.js"],
                "routes": ["approvals.js", "deliveries.js", "purchases.js", "warehouses.js"],
                "validators": ["schemas.js"]
            },
            ".": ["server.js", ".env.example", "package.json", "README.md"]
        },
        "frontend": {
            "app": {
                "alerts": ["page.tsx"],
                "intake": ["page.tsx"],
                "warehouses": {"[id]": ["page.tsx"]},
                ".": ["globals.css", "layout.tsx", "page.tsx"]
            },
            "components": ["DataTable.tsx", "Header.tsx", "KPICard.tsx", "Modal.tsx", "SectionHeader.tsx", "Sidebar.tsx", "StatusBadge.tsx", "WarehouseCa...tsx"],
            "lib": ["data.ts", "format.ts"],
            ".": ["next.config.js", "package.json", "postcss.config.js", "tailwind.config.js", "tsconfig.json"]
        }
    },
    "sql": ["schema.sql"],
    "public": ["favicon.ico"],
    "src": {
        "components": {
            "ui": [
                "accordion.tsx", "alert-dialog.tsx", "alert.tsx", "aspect-ratio.tsx", "avatar.tsx",
                "badge.tsx", "breadcrumb.tsx", "button.tsx", "calendar.tsx", "card.tsx", "carousel.tsx",
                "chart.tsx", "checkbox.tsx", "collapsible.tsx", "command.tsx", "context-menu.tsx",
                "dialog.tsx", "drawer.tsx", "dropdown-menu.tsx", "form.tsx", "hover-card.tsx",
                "input-otp.tsx", "input.tsx", "label.tsx", "menubar.tsx", "navigation-menu.tsx",
                "pagination.tsx", "popover.tsx", "progress.tsx", "radio-group.tsx", "resizable.tsx",
                "scroll-area.tsx", "select.tsx", "separator.tsx", "sheet.tsx", "sidebar.tsx", "skeleton.tsx",
                "slider.tsx", "sonner.tsx", "switch.tsx", "table.tsx", "tabs.tsx", "textarea.tsx",
                "toggle-group.tsx", "toggle.tsx", "tooltip.tsx"
            ]
        },
        "hooks": ["use-mobile.tsx"],
        "lib": ["error-capture.ts", "error-page.ts", "lovable-error-repo...ts", "utils.ts"],
        "routes": ["__root.tsx", "index.tsx", "README.md"],
        ".": ["router.tsx", "routeTree.gen.ts", "server.ts", "start.ts", "styles.css"]
    },
    ".": [
        ".gitignore", ".prettierignore", ".prettierrc", "AGENTS.md", "bun.lock", "bunfig.toml",
        "components.json", "eslint.config.js", "package.json", "tsconfig.json", "vite.config.ts"
    ]
}

def create_structure(base_path, structure):
    for name, content in structure.items():
        # Handle current directory files marked with "."
        if name == ".":
            for file_name in content:
                (base_path / file_name).touch()
            continue

        current_path = base_path / name
        if isinstance(content, dict):
            current_path.mkdir(parents=True, exist_ok=True)
            create_structure(current_path, content)
        else:
            current_path.mkdir(parents=True, exist_ok=True)
            for file_name in content:
                (current_path / file_name).touch()

# Execute
base_dir = Path("my_project_output")
create_structure(base_dir, file_structure)
print(f"Structure created successfully in: {base_dir.absolute()}")