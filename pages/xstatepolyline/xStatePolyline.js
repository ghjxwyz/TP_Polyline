import Konva from "konva";
import { setup, createActor } from "xstate";

const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline; // La polyline en cours de construction

const polylineMachine = setup({
    // Quelques actions et gardes que vous pouvez utiliser dans votre machine
    actions: {
        // Créer une nouvelle polyline
        createLine: () => {
            const pos = stage.getPointerPosition();
            polyline = new Konva.Line({
                points: [pos.x, pos.y, pos.x, pos.y],
                stroke: "red",
                strokeWidth: 2,
            });
            layer.add(polyline);
        },
        // Mettre à jour le dernier point (provisoire) de la polyline
        setLastPoint: () => {
            const pos = stage.getPointerPosition();
            const currentPoints = polyline.points(); // Get the current points of the line
            const size = currentPoints.length;

            const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
            polyline.points(newPoints.concat([pos.x, pos.y]));
            layer.batchDraw();
        },
        // Enregistrer la polyline
        saveLine: () => {
            const currentPoints = polyline.points(); // Get the current points of the line
            const size = currentPoints.length;
            // Le dernier point(provisoire) ne fait pas partie de la polyline
            const newPoints = currentPoints.slice(0, size - 2);
            polyline.points(newPoints);
            layer.batchDraw();
        },
        // Ajouter un point à la polyline
        addPoint: () => {
            const pos = stage.getPointerPosition();
            const currentPoints = polyline.points(); // Get the current points of the line
            const newPoints = [...currentPoints.slice(0, -2), pos.x, pos.y, pos.x, pos.y];
            polyline.points(newPoints); // Set the updated points to the line
            layer.batchDraw(); // Redraw the layer to reflect the changes
        },
        // Abandonner le tracé de la polyline
        abandon: () => {
            polyline.destroy();
            polyline = undefined;
            layer.batchDraw();
        },
        // Supprimer le dernier point de la polyline
        removeLastPoint: () => {
            const currentPoints = polyline.points(); // Get the current points of the line
            const size = currentPoints.length;
            const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
            const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
            polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
            layer.batchDraw(); // Redraw the layer to reflect the changes
        },
    },
    guards: {
        // On peut encore ajouter un point
        pasPlein: () => {
            return polyline.points().length / 2 - 1 < MAX_POINTS;
        },
        // On peut enlever un point
        plusDeDeuxPoints: () => {
            // Deux coordonnées pour chaque point, plus le point provisoire
            return polyline.points().length > 6;
        },
    },
}).createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiACx8ArEQAcARmXqAnHwBMuxSs0GANCEyJNK3URVaAzAYOPdAdk0eVANgC+-pZoWHiERMgATmAAtrhgkQAKqATi1PTMbJy8grJoYpLSsgoIHupEBnxOmrr6+k6K6nqW1ggGRHxavnyancpOun4GgcEYOATEUbHxSSn4abSMTLQAakz8Qkgg+RJSMlslKoqaRJpOTbp6vU7dmi2IALTeROeGnU58Hr7Vih4j22MwpNonEEslUhQmLAAMYAQ2QYA2eVEuyKB0QR3apm+tgMxz4viM9wQijcGnUv0amnURlUin+IXG4QgkVhAHcCFB0ksstwkVsdoV9qASg88XwXvpegYmjdDL51MSGr4iAqnB9dJpfB5FLpfL4VAzARMiCz2ZzucxVutcgKUULijYVO0zF4DFrDB4DB5LkqPB4OsZ1HwTI51CojkbQiazRz8FyAEKw6EAa1gyGTiNtIgKe0dbWDpxMl1UZV0BgaxIeeg0NRppMqjXL9KCAOjzNZccTybTGehiM0mxzqOF8iUEaIHnOmP1hkUBqr1ID6nVmr4gx6xijTOIsYtTHmCX5w4d6IQHxO4cU1Q8hjsThUN2JRnsthxtQ+t78htbjKBps7fcYXhLMhwBXM0RFRAVxeRxfC1a9Gj8RRiU0M4iEUXUFQrYNPnVTRAlbfBUAgOBkXbMBkQg0dRRlcoBh6QxZW6b0q29NR1QGNCvVMXUf1GCiSDISi7Wo-M3EUBwajsPhPh8HoFVQlQAz4xxfgrIxt3-KZQVmVIqJHfMHzUeD1F8Y5mynW9fGJWpYJ6apPBqPVzi0mNAPjAzTyg88Tm9Mx1SslQQ2MJxn0fScIxua8mm0PU-kIoA */
    id: "polyLine",
    initial: "idle",
    states: {
        idle: {
            on: {
                MOUSECLICK: { target: "premierPoint", actions: ["createLine"] },
            },
        },
        premierPoint: {
            on: {
                MOUSECLICK: { target: "drawing", guard: "pasPlein", actions: ["addPoint"] },
                MOUSEMOVE: { actions: ["setLastPoint"] },
                Escape: { target: "idle", actions: ["abandon"] },
            },
        },
        drawing: {
            on: {
                MOUSECLICK: { guard: "pasPlein", actions: ["addPoint"] },
                MOUSEMOVE: { actions: ["setLastPoint"] },
                Backspace: [
                    { guard: "plusDeDeuxPoints", actions: ["removeLastPoint"] },
                    { target: "premierPoint", actions: ["removeLastPoint"] },
                ],
                Enter: { target: "idle", actions: ["saveLine"] },
                Escape: { target: "idle", actions: ["abandon"] },
            },
        },
    },
});

// On démarre la machine
const polylineActor = createActor(polylineMachine);
polylineActor.subscribe((snapshot) => {
    console.log("Current state:", snapshot.value);
});
polylineActor.start();

// On envoie les événements à la machine
stage.on("click", () => {
    polylineActor.send({ type: "MOUSECLICK" });
});

stage.on("mousemove", () => {
    polylineActor.send({ type: "MOUSEMOVE" });
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineActor.send({ type: event.key });
});
