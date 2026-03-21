import Middleware from "../types/Middleware";
import bodyparser from "body-parser";

const middleware: Middleware = bodyparser.json();

module.exports = middleware;