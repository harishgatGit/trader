Initialize shorts structure

Run the script to create `current_video` and `shorts_for_generation` folders under each ticker directory found in `outputs/videos`.

Usage:

```
node scripts/init_shorts_structure.js
```

Result:
- For each ticker folder the script will ensure a `current_video` folder exists.
- It will create a `shorts_for_generation/short_template.json` containing the 30s content formula (hook, proof, CTA).

Edit the template to inject real metric or headline before generating the short.
