# Epstein File description
I was frustrated looking at the [Epstein files](https://www.justice.gov/epstein) and not having any info about what file might contain. This is especially true for videos which show up as pdfs.

This extension will add some tags with basic info and a description with more details.

This is a WIP as there are 3 million files. Please be patient or add info.

## Helpful Hints

### Videos
Many of the videos, search:
>no images produced

click on a file and change (pdf->mp4/mov)

### Get Metadata (for adding to extension)
From console
```
JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll('.result-item h3 a')).map(link=>[link.textContent.replaceAll('.pdf',''), {tags: ['UNKNOWN'], description: 'Nothing to see here'}])))
```