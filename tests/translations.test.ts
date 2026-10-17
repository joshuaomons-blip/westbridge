import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import en from "../messages/en.json";
import pl from "../messages/pl.json";
import ja from "../messages/ja.json";
import es from "../messages/es.json";
import de from "../messages/de.json";
import { STATUS_CODES } from "../src/lib/statuses";

type Tree = { [k: string]: string | Tree };
const flat = (o: Tree, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    if (typeof v === "string") acc[p + k] = v;
    else Object.assign(acc, flat(v, `${p}${k}.`));
    return acc;
  }, {});

const files = { en, pl, ja, es, de } as Record<string, Tree>;
const english = flat(en as Tree);

describe("translation files", () => {
  for (const [code, tree] of Object.entries(files)) {
    it(`${code} has every key, no extras, no empty strings`, () => {
      const f = flat(tree);
      expect(Object.keys(f).sort()).toEqual(Object.keys(english).sort());
      for (const [k, v] of Object.entries(f)) expect(v.trim().length, `${code}:${k}`).toBeGreaterThan(0);
    });
    it(`${code} keeps ICU placeholders`, () => {
      const f = flat(tree);
      for (const [k, v] of Object.entries(english)) {
        const placeholders = v.match(/\{[a-z]+\}/g) ?? [];
        for (const ph of placeholders) expect(f[k], `${code}:${k}`).toContain(ph);
      }
    });
  }

  it("non-English files are actually translated", () => {
    for (const code of ["pl", "ja", "es", "de"]) {
      const f = flat(files[code]);
      const same = Object.keys(english).filter((k) => f[k] === english[k] && !/siteName|accept/.test(k));
      // Only a handful of brand/universal strings may be identical.
      expect(same.length, `${code}: ${same.join(", ")}`).toBeLessThan(5);
    }
  });

  it("has a label and description for every shipment status in every language", () => {
    for (const tree of Object.values(files)) {
      const f = flat(tree);
      for (const s of STATUS_CODES) {
        expect(f[`status.${s}`]).toBeTruthy();
        expect(f[`statusDescription.${s}`]).toBeTruthy();
      }
    }
  });

  it("every translation key used in the code exists", () => {
    const missing: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name)) {
          const src = readFileSync(p, "utf8");
          // const t = useTranslations("ns") / await getTranslations("ns")
          // The same variable name (e.g. `t`) may be bound to different namespaces in different functions.
          const nsByVar = new Map<string, string[]>();
          for (const m of src.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*(?:"([\w.]+)"|\{[^}]*namespace: "([\w.]+)"[^}]*\})\s*\)/g)) {
            nsByVar.set(m[1], [...(nsByVar.get(m[1]) ?? []), m[2] ?? m[3]]);
          }
          for (const [v, namespaces] of nsByVar) {
            for (const m of src.matchAll(new RegExp(`\\b${v}\\("([\\w.]+)"`, "g"))) {
              if (!namespaces.some((ns) => `${ns}.${m[1]}` in english)) missing.push(`${p}: ${namespaces.join("|")}.${m[1]}`);
            }
          }
        }
      }
    };
    walk(join(__dirname, "../src"));
    expect(missing).toEqual([]);
  });
});
