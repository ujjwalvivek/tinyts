# TinyTS v0.1.5 - Release Notes

#### Features & API Enhancements

- Changed `overlayCanvas` visibility from `private` to `readonly` public. 
- Publicly exported the `createRenderer` method from the engine's root entrypoint to allow flexible programmatic bootstrap.
- Resolved an alpha-blending logic bug in the fragment shader for rectangular outlines (Shape 2).
