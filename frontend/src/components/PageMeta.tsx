import { useEffect } from 'react'

interface PageMetaProps {
  /** Document title for this route. The shell's title is the site default. */
  title: string
  /** Editor and print surfaces are private, so they stay out of search. */
  noindex?: boolean
}

/**
 * Route level document metadata.
 *
 * A single page app keeps one <head>, so index.html's tags describe the cold
 * load and this keeps them honest as the router moves: the title follows the
 * section, and the robot policy flips for the private routes. The effect runs
 * after paint, which is also when the router has settled the title.
 */
export function PageMeta({ title, noindex = false }: PageMetaProps) {
  useEffect(() => {
    document.title = title
    const robots = document.querySelector('meta[name="robots"]')
    robots?.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow')
  }, [title, noindex])

  return null
}
