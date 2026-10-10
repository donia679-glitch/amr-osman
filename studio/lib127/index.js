// v127: library additions, one file per area so they can be written separately (each = (helpers) => {KITCHEN, DRESSING, PANEL, FREE, SMART})
import kitchen from "./kitchen.js";
import sleep from "./sleep.js";
import rooms from "./rooms.js";
import engine from "./engine.js";
export default [kitchen, sleep, rooms, engine];
