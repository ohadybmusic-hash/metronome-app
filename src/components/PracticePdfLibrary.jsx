import { useMemo, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { getVisiblePracticePdfLibraries, PRACTICE_PDF_LIBRARIES } from '../lib/practicePdfCategories.js'
import { normalizeExerciseLabel } from '../lib/exerciseProgressUi.js'
import { practiceObsidianChrome } from '../lib/practiceObsidianUi.js'
import { PracticeSheetPdfEmbed } from './PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../context/IosPdfReaderContext.jsx'
import './PracticePdfLibrary.css'

function buildSectionsForLibrary(lib, customExerciseNames, placements, sheetsByExercise) {
  const prefix = lib.pathPrefix.replace(/\/$/, '')
  const builtInOrder = lib.sections.map((s) => s.title)

  /** @type {Map<string, Array<{ title: string, href: string, key: string, isCustom: boolean }>>} */
  const map = new Map()

  for (const sec of lib.sections) {
    map.set(
      sec.title,
      sec.items.map((item) => ({
        title: item.title,
        href: `${prefix}/${item.file}`,
        key: `${lib.id}-${item.file}`,
        isCustom: false,
      })),
    )
  }

  for (const rawName of customExerciseNames) {
    const name = normalizeExerciseLabel(rawName)
    const p = placements[name]
    if (!p || p.libId !== lib.id) continue
    const secTitle = p.sectionTitle
    if (!map.has(secTitle)) map.set(secTitle, [])
    const url = (sheetsByExercise[name]?.pdfUrl || '').trim()
    map.get(secTitle).push({
      title: name,
      href: url,
      key: `custom-${lib.id}-${name}`,
      isCustom: true,
    })
  }

  const extra = [...map.keys()]
    .filter((t) => !builtInOrder.includes(t))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const order = [...builtInOrder, ...extra]
  return order.map((title) => ({ title, items: map.get(title) || [] }))
}

export default function PracticePdfLibrary({
  customExerciseNames = [],
  customExercisePlacements = {},
  sheetsByExercise = {},
  visibleLibraries: visibleLibrariesProp,
  visualLayout,
} = {}) {
  const { user } = useAuth()
  const [previewUrl, setPreviewUrl] = useState(/** @type {string | null} */ (null))
  const ob = practiceObsidianChrome(visualLayout)

  const isLocalhostPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const visibleLibraries = useMemo(() => {
    if (visibleLibrariesProp?.length) return visibleLibrariesProp
    if (isLocalhostPreview) return PRACTICE_PDF_LIBRARIES
    return getVisiblePracticePdfLibraries(user?.email)
  }, [visibleLibrariesProp, isLocalhostPreview, user?.email])

  if ((!user?.email && !isLocalhostPreview) || visibleLibraries.length === 0) {
    return null
  }

  return (
    <details className={ob ? 'practicePdfLib practicePdfLib--obsidian' : 'practicePdfLib'}>
      <summary>
        <span>Sheet library</span>
        <span className="practicePdfLib__chev" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="practicePdfLib__body">
        <p className="mb-4 text-xs text-on-surface-variant">
          Open a main folder, then a section. Course PDFs and your custom exercises (by folder) appear
          here. Custom entries without a PDF link can get one from the practice log.
        </p>

        <div className="space-y-2">
          {visibleLibraries.map((lib) => {
            const sectionModels = buildSectionsForLibrary(
              lib,
              customExerciseNames,
              customExercisePlacements,
              sheetsByExercise,
            )
            return (
              <details key={lib.id} className="practicePdfLib__mainFolder">
                <summary>
                  <span>{lib.label}</span>
                  <span className="practicePdfLib__chev" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="practicePdfLib__mainFolderBody">
                  <div className="space-y-2">
                    {sectionModels.map((sec) => (
                      <details key={`${lib.id}-${sec.title}`} className="practicePdfLib__folder">
                        <summary>
                          <span>{sec.title}</span>
                          <span className="practicePdfLib__chev" aria-hidden>
                            ▾
                          </span>
                        </summary>
                        <div className="practicePdfLib__folderBody">
                          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {sec.items.map((item) => {
                              const hasHref = Boolean(item.href && item.href.trim())
                              const isPreview = hasHref && previewUrl === item.href
                              return (
                                <li
                                  key={item.key}
                                  className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface-container-high p-2.5 text-sm"
                                >
                                  <span className="leading-snug text-on-surface">
                                    {item.title}
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {item.isCustom && !hasHref ? (
                                      <span className="text-[11px] text-on-surface-variant">
                                        Add a PDF URL in Practice log for this exercise.
                                      </span>
                                    ) : null}
                                    {hasHref ? (
                                      <>
                                        <PracticePdfLink
                                          className="metronome__btn metronome__btn--primary !no-underline !py-1.5 !text-[11px]"
                                          href={item.href}
                                          title={item.title}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Open PDF
                                        </PracticePdfLink>
                                        <button
                                          type="button"
                                          className="metronome__btn !py-1.5 !text-[11px]"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setPreviewUrl(isPreview ? null : item.href)
                                          }}
                                        >
                                          {isPreview ? 'Hide' : 'Preview'}
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </details>
            )
          })}
        </div>

        {previewUrl ? (
          <div className="mt-4">
            <PracticeSheetPdfEmbed
              title="PDF preview"
              src={previewUrl}
              iframeClassName="h-[min(65vh,560px)] w-full border-0 bg-surface-dim"
            />
          </div>
        ) : null}
      </div>
    </details>
  )
}
