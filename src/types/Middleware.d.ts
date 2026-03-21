import { Request, Response, NextFunction } from "express";

type Middleware = (request: Request, response: Response, next: NextFunction) => void | Promise<void>;

export default Middleware;