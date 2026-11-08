# The worlds: image slots

Each of the seven navigation pages (and the home page) is its own world. To change a picture, **replace the file with the same name** in this folder. Nothing else needs editing. Right now every slot holds a stand-in photograph chosen to match the world's mood.

**Sizes.** Vistas (full-width bands): 2000 px wide or more, landscape, JPG. Cluster photos: 1000 px or more on the short side; they are shown as tall 4:5 frames, so keep the subject near the centre. Door tiles on the home page and the "Continue" strips reuse the vista files (and `river-a`).

| World | Page | Vista (full width) | Cluster photos (in order) |
|---|---|---|---|
| Oracle (indigo night) | Divination & Consultation | `oracle-vista.jpg` | `oracle-a.jpg`, `oracle-b.jpg` |
| Seasons (forest green) | Spiritual Development | `seasons-vista.jpg` | `seasons-1.jpg` to `seasons-4.jpg` |
| Hearth (ember, earth) | Shamanic Coaching | `hearth-vista.jpg` | `hearth-a.jpg`, `hearth-b.jpg`, `hearth-c.jpg` |
| Village (amber, fire) | Community Offerings | `village-vista.jpg` | `village-a.jpg`, `village-b.jpg`, `village-c.jpg` |
| School (walnut, candle) | Workshops & Courses | `school-vista.jpg` | `school-a.jpg`, `school-b.jpg` |
| Library (ink green) | Resources | `library-vista.jpg` | `library-a.jpg`, `library-b.jpg` |
| River (deep teal) | Newsletter | `river-vista.jpg` | `river-a.jpg`, `river-b.jpg` |
| Home | Home | (doors use every vista and `river-a`) | trio: `oracle-a.jpg`, `hearth-a.jpg`, `village-b.jpg` |

The hero photograph at the top of each page is separate and lives in `images/uploads/` (set in that page's HTML).

**Licence note.** The stand-ins are free-licence stock photographs from the repository's existing library, your own brand photographs, and the nine About-page images. Confirm the licence and credit for anything that is not yours before it goes to the public repository.

**Words.** Every line on these bands is a line already on the same page, word for word. To change a line, edit it in that page's HTML (search `wd-vista-line` or `wd-cluster-line`).

**Stillness.** There is no motion on these pages. `css/still.css` holds it still.
