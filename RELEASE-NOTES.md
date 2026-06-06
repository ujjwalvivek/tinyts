# TinyTS v0.2.0 - Release Notes

### Post-Processing Pipeline And A Tech Demo game

- **Post-processing**: All three rendering backends now support an optional post-processing
  stack configurable via engineStart({ post: { ... } }). The stack is
  applied in order: bloom -> atmosphere fog -> color grading ->
  vignette -> film grain.
- TinyTS now ships with the font embedded as base64, so you don't need to 
  include an external font file.
- Added a tech demo game that showcases the engine's capabilities
  https://tinyts.ujjwalvivek.com/game
