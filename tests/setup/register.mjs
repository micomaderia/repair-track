// Lets Node's built-in test runner load the app's extensionless TypeScript imports.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        for (const suffix of ['.ts', '.tsx', '/index.ts']) {
          try {
            return nextResolve(specifier + suffix, context);
          } catch {
            // try next suffix
          }
        }
      }
      throw error;
    }
  },
});
