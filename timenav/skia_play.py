import contextlib, glfw, skia
from OpenGL import GL

WIDTH, HEIGHT = 640, 480

@contextlib.contextmanager
def glfw_window():
    if not glfw.init():
        raise RuntimeError('glfw.init() failed')
    glfw.window_hint(glfw.STENCIL_BITS, 8)
    window = glfw.create_window(WIDTH, HEIGHT, '', None, None)
    glfw.make_context_current(window)
    yield window
    glfw.terminate()

@contextlib.contextmanager
def skia_surface(window):
    context = skia.GrDirectContext.MakeGL()
    backend_render_target = skia.GrBackendRenderTarget(
        WIDTH,
        HEIGHT,
        0,  # sampleCnt
        0,  # stencilBits
        skia.GrGLFramebufferInfo(0, GL.GL_RGBA8))
    surface = skia.Surface.MakeFromBackendRenderTarget(
        context, backend_render_target, skia.kBottomLeft_GrSurfaceOrigin,
        skia.kRGBA_8888_ColorType, skia.ColorSpace.MakeSRGB())
    assert surface is not None
    yield surface
    context.abandonContext()

with glfw_window() as window:
    GL.glClear(GL.GL_COLOR_BUFFER_BIT)

    with skia_surface(window) as surface:
        with surface as canvas:
            canvas.drawCircle(100, 100, 40, skia.Paint(Color=skia.ColorGREEN))
            paint1 = skia.Paint(
                AntiAlias=True,
                Color=skia.Color(255, 0, 0),
                Style=skia.Paint.kFill_Style)

            paint2 = skia.Paint(
                AntiAlias=True,
                Color=skia.Color(0, 136, 0),
                Style=skia.Paint.kStroke_Style,
                StrokeWidth=3)

            paint3 = skia.Paint(
                AntiAlias=True,
                Color=skia.Color(136, 136, 136))

            blob1 = skia.TextBlob("Skia!", skia.Font(None, 64.0, 1.0, 0.0))
            blob2 = skia.TextBlob("Skia!", skia.Font(None, 64.0, 1.5, 0.0))

            canvas.clear(skia.ColorWHITE)
            canvas.drawTextBlob(blob1, 20.0, 64.0, paint1)
            canvas.drawTextBlob(blob1, 20.0, 144.0, paint2)
            canvas.drawTextBlob(blob2, 20.0, 224.0, paint3)
            
        surface.flushAndSubmit()
        glfw.swap_buffers(window)

        while (glfw.get_key(window, glfw.KEY_ESCAPE) != glfw.PRESS
            and not glfw.window_should_close(window)):
            glfw.wait_events()