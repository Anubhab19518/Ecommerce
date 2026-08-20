// PUBLIC API — only the service and routes are exposed.
// Model, Repository, and internal details are intentionally hidden.
// Other modules MUST import only from this file.
export { UserService } from './user.service';
export { userRoutes } from './user.routes';
