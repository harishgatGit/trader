import subprocess
import json
import os
import sys
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, List

class RemotionRenderer:
    def __init__(self):
        pass

    def render(self, 
               project_path: Path, 
               composition_id: str, 
               output_path: Path, 
               props: Dict[str, Any]) -> str:
        """
        Renders a Remotion video locally via npx remotion render.
        Works on Windows (local dev) and Linux (Docker/server).
        """
        # Resolve path environment to include Node.js on Windows
        env = os.environ.copy()
        node_path = "C:\\Program Files\\nodejs"
        if sys.platform == "win32" and node_path not in env.get("PATH", ""):
            env["PATH"] = f"{node_path};{env.get('PATH', '')}"

        # 1. Ensure node_modules exists — install if missing
        node_modules = project_path / "node_modules"
        if not node_modules.exists():
            print(f"Installing Remotion dependencies in {project_path}...")
            result = subprocess.run(
                ["npm", "install"],
                cwd=str(project_path),
                env=env,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                shell=(sys.platform == "win32")
            )
            if result.returncode != 0:
                raise Exception(f"Failed to run npm install in Remotion project: {result.stderr}")

        # 2. Write props to a temp JSON file in the project directory
        #    (Remotion CLI reads props relative to CWD = project_path)
        props_filename = f"tmp-props-{uuid.uuid4()}.json"
        props_file = project_path / props_filename
        with open(props_file, 'w', encoding='utf-8') as f:
            json.dump(props, f, indent=2)

        try:
            # 3. Build the Remotion render command
            output_path.parent.mkdir(parents=True, exist_ok=True)

            cmd: List[str] = [
                "npx", "remotion", "render",
                "index.ts",
                composition_id,
                str(output_path),
                f"--props={props_file.name}",
                "--overwrite",
                "--log=verbose",
            ]

            # On Linux/Docker, headless Chromium needs the angle GL backend.
            # On Windows, the default GL backend works fine — don't add this flag.
            if sys.platform != "win32":
                cmd.append("--gl=angle")
                cmd.append("--concurrency=1")  # limit workers in container

            print(f"Invoking Remotion CLI: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                cwd=str(project_path),
                env=env,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                shell=(sys.platform == "win32")  # shell=True required on Windows for npx
            )

            # Save render log for debugging
            render_log_path = output_path.parent / "render-log.txt"
            with open(render_log_path, 'w', encoding='utf-8') as f:
                f.write(f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}")

            if result.returncode != 0:
                raise Exception(
                    f"Remotion render failed (exit {result.returncode}).\n"
                    f"Check render-log.txt for details.\n"
                    f"Last stderr: {result.stderr[-500:]}"
                )

            return str(output_path)
        finally:
            # Clean up temp props file
            if props_file.exists():
                try:
                    os.remove(props_file)
                except Exception:
                    pass
