---
description: "Add one or more photos to the Charmera gallery by updating photos.json and keeping the canvas layout balanced."
name: "Add Photos"
argument-hint: "Describe the photo files to add and any placement or sizing preferences"
agent: "agent"
---

Add the requested photo entries to `photos.json` for the Charmera gallery.

Requirements:

- Preserve valid JSON formatting.
- Use the existing coordinate system and layout style from the current gallery.
- Keep visual spacing comfortable and avoid clustering everything in one direction.
- If the user gives no coordinates, infer a balanced placement based on nearby photos.
- Mention any assumptions about width or placement in the response.

If the task also requires image preparation, note that images should be compressed before commit and ideally stay around 300KB or less.
