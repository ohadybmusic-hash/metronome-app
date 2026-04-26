import { useMemo, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { PRACTICE_PDF_LIBRARIES } from '../lib/practicePdfCategories.js'
import { PracticeSheetPdfEmbed } from './PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../context/IosPdfReaderContext.jsx'
import './PracticePdfLibrary.css'

export default function PracticePdfLibrary() {
  const { user } = useAuth()
  const [previewUrl, setPreviewUrl] = useState(/** @type {string | null} */ (null))

  const visibleLibraries = useMemo(() => {
    const email = user?.email
    if (!email) return []
    return PRACTICE_PDF_LIBRARIES.filter((lib) => lib.canAccess(String(email).trim()))
  }, [user?.email])

  if (!user?.email || visibleLibraries.length === 0) {
    return null
  }

  return (
    <details className="practicePdfLib">
      <summary>
        <span>Sheet library</span>
        <span className="practicePdfLib__chev" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="practicePdfLib__body">
        <p className="mb-4 text-xs text-[var(--text)]">
          Open a main folder, then a section. PDFs you can access are shown here only.
        </p>

        <div className="space-y-2">
          {visibleLibraries.map((lib) => (
            <details key={lib.id} className="practicePdfLib__mainFolder">
              <summary>
                <span>{lib.label}</span>
                <span className="practicePdfLib__chev" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="practicePdfLib__mainFolderBody">
                <div className="space-y-2">
                  {lib.sections.map((sec) => (
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
                            const href = `${lib.pathPrefix.replace(/\/$/, '')}/${item.file}`
                            const isPreview = previewUrl === href
                            return (
                              <li
                                key={`${lib.id}-${item.file}`}
                                className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] p-2.5 text-sm"
                              >
                                <span className="leading-snug text-[var(--text-h)]">{item.title}</span>
                                <div className="flex flex-wrap gap-2">
                                  <PracticePdfLink
                                    className="metronome__btn metronome__btn--primary !no-underline !py-1.5 !text-[11px]"
                                    href={href}
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
                                      setPreviewUrl(isPreview ? null : href)
                                    }}
                                  >
                                    {isPreview ? 'Hide' : 'Preview'}
                                  </button>
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
          ))}
        </div>

        {previewUrl ? (
          <div className="mt-4">
            <PracticeSheetPdfEmbed
              title="PDF preview"
              src={previewUrl}
              iframeClassName="h-[min(65vh,560px)] w-full border-0 bg-[#2a2a2e]"
            />
          </div>
        ) : null}
      </div>
    </details>
  )
}
