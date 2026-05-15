import { GeometryProcessor } from "https://esm.sh/@ifc-lite/geometry@1.18.5";
import { IfcParser } from "https://esm.sh/@ifc-lite/parser@2.4.0";
import { Renderer } from "https://esm.sh/@ifc-lite/renderer@1.20.0";

/**
 *
 * @param canvas {HTMLCanvasElement} viewer canvas
 * @param renderer {Renderer} IFC renderer
 */
function setupCameraControls(canvas, renderer, refreshCallback) {
    const camera = renderer.getCamera();

    let isDragging = false;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    // Mouse down - start drag
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        isPanning = e.button === 1 || e.button === 2 || e.shiftKey; // Middle/right click or shift = pan
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = isPanning ? "move" : "grabbing";
    });

    // Mouse move - orbit or pan
    canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        if (isPanning) {
            camera.pan(deltaX, deltaY);
        } else {
            camera.orbit(deltaX, deltaY);
        }

        refreshCallback();
    });

    // Mouse up - stop drag
    canvas.addEventListener("mouseup", () => {
        isDragging = false;
        isPanning = false;
        canvas.style.cursor = "grab";
    });

    // Mouse leave - stop drag
    canvas.addEventListener("mouseleave", () => {
        isDragging = false;
        isPanning = false;
    });

    // Scroll wheel - zoom
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom towards mouse position
        camera.zoom(
            e.deltaY,
            false,
            mouseX,
            mouseY,
            canvas.width,
            canvas.height,
        );
        refreshCallback();
    });

    // Prevent context menu on right-click
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Set initial cursor
    canvas.style.cursor = "grab";
}

const computeHeight = () => {
    const isFullscreen = !!document.fullscreenElement;
    if (isFullscreen) {
        const h =
            window.visualViewport?.height ||
            window.innerHeight ||
            document.documentElement.clientHeight ||
            0;
        // marimo fullscreen mode has a 1rem padding, this avoids scrollbars
        if (h) return h - 32;
    }
    // TODO: how to retrieve the max height of the marimo/Jupyter cell?
    return 578;
};

export default () => {
    /** @type {HTMLCanvasElement} */
    let canvas;
    /** @type {Renderer} */
    let renderer;
    /** @type {GeometryProcessor} */
    let geometry;
    /** @type {IfcParser} */
    let parser;
    let store;
    /** @type {Set<number>} */
    const selectedIds = new Set();

    function refresh() {
        renderer.render({ selectedIds });
    }

    return {
        async initialize() {
            canvas = document.createElement("canvas");
            canvas.style.position = "relative";
            canvas.style.alignContent = "center";
            renderer = new Renderer(canvas);
            await renderer.init();
            setupCameraControls(canvas, renderer, refresh);
            geometry = new GeometryProcessor();
            await geometry.init();
            parser = new IfcParser();
        },

        async render({ model, el }) {
            const loadModel = async () => {
                const modelContents = model.get("ifc_model").contents;
                const bufferArray = new TextEncoder().encode(modelContents);
                store = await parser.parseColumnar(bufferArray, {
                    onProgress: ({ phase, percent }) => {
                        console.log(`Parsing: ${phase} ${percent}%`);
                    },
                });
                const geometryResult = await geometry.process(bufferArray);
                renderer.loadGeometry(geometryResult);
                renderer.fitToView();
                refresh();
            };

            model.on("change:ifc_model", async () => {
                await loadModel();
                model.set("selected_guids", null);
                model.save_changes();
            });

            canvas.addEventListener("click", async (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const { expressId } = (await renderer.pick(x, y)) || {};
                if (!e.ctrlKey) {
                    selectedIds.clear();
                }
                if (expressId != null) {
                    selectedIds.add(expressId);
                }
                refresh();
                const selectedGlobalIds = selectedIds
                    .values()
                    .map(store.entities.getGlobalId)
                    .toArray();
                model.set("selected_guids", selectedGlobalIds);
                model.save_changes();
            });

            const resizeObserver = new ResizeObserver((e) => {
                const { width } = e[0].contentRect;
                const height = computeHeight();
                console.log("Resizing canvas to", width, height);
                renderer.resize(width, height);
                refresh();
            });
            resizeObserver.observe(el);

            el.appendChild(canvas);
            await loadModel();
        },
    };
};
