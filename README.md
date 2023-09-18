# Replbox

***NOTE***: this package is deprecated. There will be more interesting interpreter support in Replit coming soon!

---

A set of interpreters that have been historically used to run things on the client. It is the successor of https://github.com/replit-archive/jsrepl.

After a migration away from client-evaluated things, we turned this into a CLI package to do the migration in a backwards compatible fashion, in addition to supporting languages that only have a JS-based interpreter.

Example usage `.replit`:

```toml
entrypoint = "main.scm"

[interpreter]
command = [
"replit-replbox",
"--ps1", "\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002 ",
"-i",
"scheme"
]
```
