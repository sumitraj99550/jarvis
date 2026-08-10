/**
 * RealBufferService — NOT YET IMPLEMENTED.
 * ---------------------------------------------------------------------------
 * Fill this in once a paid Buffer plan + API access token is available.
 * It implements the exact same `BufferService` interface as
 * `MockBufferService`, so once these methods call the real Buffer API,
 * `src/lib/buffer/index.ts` can switch every caller over with a one-line
 * change — no route, tool, or UI changes required.
 *
 * Real Buffer API reference:
 *   GET    /1/profiles.json                → list connected social profiles
 *   POST   /1/updates/create.json           → schedule/publish a post
 *   PUT    /1/updates/:id/update.json       → edit a scheduled post
 *   POST   /1/updates/:id/destroy.json      → delete a post
 *   GET    /1/updates/:id.json              → fetch a single post + analytics
 *
 * Auth: Bearer token in the Authorization header, from
 * `process.env.BUFFER_ACCESS_TOKEN`.
 */

import type { BufferService } from "./service";

const NOT_IMPLEMENTED =
  "RealBufferService is not implemented yet. Set BUFFER_ACCESS_TOKEN once " +
  "you have a paid Buffer plan, then fill in the methods in " +
  "src/lib/buffer/real-service.ts against Buffer's REST API.";

export class RealBufferService implements BufferService {
  async listAccounts(): ReturnType<BufferService["listAccounts"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async connectAccount(): ReturnType<BufferService["connectAccount"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async disconnectAccount(): ReturnType<BufferService["disconnectAccount"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listPosts(): ReturnType<BufferService["listPosts"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getPost(): ReturnType<BufferService["getPost"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async createPost(): ReturnType<BufferService["createPost"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async updatePost(): ReturnType<BufferService["updatePost"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async publishPost(): ReturnType<BufferService["publishPost"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async deletePost(): ReturnType<BufferService["deletePost"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getAnalytics(): ReturnType<BufferService["getAnalytics"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getSettings(): ReturnType<BufferService["getSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async updateSettings(): ReturnType<BufferService["updateSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
