# SectionEditor gotchas — frontend

> Read on-demand when working with SectionEditor, richtar categories, or competition templates.

## SectionEditor — kanonická komponenta

`src/components/shared/section-editor.tsx` = **jediné místo** UI pro tvorbu/edit sekce.
- `competitions/new/page.tsx` (`fieldArrayName="categories"`)
- Templates + `dashboard/competitions/[id]/sections/new/page.tsx` (`fieldArrayName="sections"`)
- `hideAppend={true}` skryje "Přidat sekci" — pro edit dialogy jedné položky
- **Nepřidávej inline section form jinde** — rozšiř `SectionEditor`

### Richtar kategorie (danceStyle)
- `danceStyle = "SINGLE_DANCE" | "MULTIDANCE"` → Richtar; `"STANDARD" | "LATIN" | ...` → ČSTS
- BE `danceStyle` je volný `String` — nové hodnoty projdou bez BE změny
- Richtar tance: `["Samba", "Cha Cha", "Rumba", "Paso Doble", "Polka", "Jive"]` (`RICHTAR_DANCES`)
- Age range: Junior `maxBirthYear=2014`, Děti 2015–2017, Mini 2018–2022
- `SectionTemplateItem` má `dances?: { danceName?: string }[]`, `minBirthYear?`, `maxBirthYear?`

### CompetitionTemplate — backend validace
- `icon` má `@NotBlank` → FE fallback `data.icon?.trim() || "📋"` v handleCreate/handleEdit
- `SectionTemplateValidator.VALID_DANCE_STYLES` je whitelist — při novém danceStyle přidat do setu v `SectionTemplateValidator.java`
- Java `SectionTemplateItem` record MUSÍ obsahovat všechna pole z FE interface — jinak se Richtar data při uložení ztratí
- `competitorType`/`competitionType` validator kontroluje `!= null` ale NE `!isEmpty()` → `""` způsobí 400. FE: posílej `|| undefined`
