/**
 * Offerings Data — structured source of truth for all single session offerings.
 * Used by offering detail pages, the book-a-session hub, and the nav dropdown.
 * Update prices, descriptions, and journey steps here — pages render from this data.
 */

export const OFFERINGS = [
  {
    id: 'platicas',
    slug: 'platicas',
    name: 'Pl\u00e1ticas',
    subtitle: 'Guidance & Counsel',
    navLabel: 'Pl\u00e1ticas \u2014 Guidance & Counsel',
    duration: '90 minutes',
    format: 'Virtual (Zoom)',
    formatShort: 'Virtual',
    availability: 'Days TBD',
    isGateway: true,
    description: 'Sacred conversation at the threshold of knowing. Strategic spiritual counsel. A space to be witnessed, guided, and met with honesty and devotion.',
    extendedDescription: 'These sessions are available as support sessions for deeper ceremonial containers, and for ongoing community care.',
    whatSupports: [
      'Verbal and Emotional Processing',
      'Ceremonial Preparation and Aftercare',
      'Spiritual & Life Support',
      'Consultations / Intake & Inquiry',
    ],
    aftercare: false,
    aftercareNote: null,
    virtualNote: 'Please find a space to be comfortable where we may sit and connect in the depth of what brings you to this work, without distraction. Also, it is highly recommended to attend these sessions on a laptop or desktop, and not on a cellular or tablet device.',
    zoomLink: 'https://us02web.zoom.us/j/7619280040',
    zoomId: '761 928 0040',
    zoomPasscode: 'welcome',
    scale: {
      patron:        { min: 400, label: 'Patron',        color: 'patron' },
      abundance:     { min: 300, label: 'Abundance',      color: 'abundance' },
      community:     { min: 250, label: 'Community',      color: 'community' },
      accessibility: { min: 200, label: 'Accessibility',  color: 'accessibility' },
    },
    journeySteps: [
      {
        title: 'Schedule Your Intake Call',
        content: '<p>The first step into this work is an Intake & Inquiry call \u2014 itself a Pl\u00e1ticas session. This is not a brief introduction. It is a substantive, paid consultation where we explore what brings you here, what you\u2019re being called toward, and how this practice might serve your path.</p><p><a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="margin-top:1rem;">Begin Here</a></p>',
      },
      {
        title: 'The Intake Consultation',
        content: '<p>During our intake conversation, we\u2019ll explore your current life circumstances, spiritual history, what\u2019s calling you to this work, and what container might be the best fit. This is both an interview and a threshold \u2014 an assessment of readiness and resonance.</p>',
      },
      {
        title: 'Preparation',
        content: '<p>Find a quiet, private space where you can be fully present without distraction. Have water nearby. Consider journaling beforehand about what you\u2019d like to explore. Arrive with an open heart and honest intention.</p>',
      },
      {
        title: 'The Session',
        content: '<p>A 90-minute virtual session via Zoom. We\u2019ll move through verbal and emotional processing, spiritual guidance, and strategic counsel. The conversation follows your needs \u2014 whether that\u2019s ceremonial preparation, life transition support, aftercare integration, or deep inquiry.</p>',
      },
      {
        title: 'Integration',
        content: '<p>After our session, take time to rest and reflect. Journaling is encouraged. Notice what arises in the days following \u2014 dreams, emotions, insights. These are part of the work continuing to move through you.</p>',
      },
      {
        title: 'Ongoing & Deeper Work',
        content: '<p>Pl\u00e1ticas sessions are available on an ongoing basis for continued support. They also serve as the entry point for all deeper ceremonial containers, developmental arcs, and group experiences. <a href="/offerings/">Explore all offerings \u2192</a></p>',
      },
    ],
  },

  {
    id: 'divinations',
    slug: 'divinations',
    name: 'Ancestral & Elemental Divinations',
    subtitle: null,
    navLabel: 'Ancestral & Elemental Divinations',
    duration: '2 hours',
    format: 'Virtual (Zoom)',
    formatShort: 'Virtual',
    availability: 'Days TBD',
    isGateway: false,
    description: 'Readings and transmissions from the ancestral and elemental realms \u2014 a mirror held by those who walked before you, for clarity at the crossroads.',
    extendedDescription: 'These sessions are available as support sessions for deeper ceremonial containers, and for ongoing community care.',
    aftercare: false,
    aftercareNote: null,
    virtualNote: 'Please find a space to be comfortable where we may sit and connect in the depth of what brings you to this work, without distraction. Also, it is highly recommended to attend these sessions on a laptop or desktop, and not on a cellular or tablet device.',
    zoomLink: 'https://us02web.zoom.us/j/7619280040',
    zoomId: '761 928 0040',
    zoomPasscode: 'welcome',
    scale: {
      patron:        { min: 500, label: 'Patron',        color: 'patron' },
      abundance:     { min: 400, label: 'Abundance',      color: 'abundance' },
      community:     { min: 350, label: 'Community',      color: 'community' },
      accessibility: { min: 300, label: 'Accessibility',  color: 'accessibility' },
    },
    journeySteps: [
      {
        title: 'Schedule Your Intake Call',
        content: '<p>All work begins with an Intake & Inquiry call (a Pl\u00e1ticas session). This conversation establishes whether divination work is the right container for what you\u2019re seeking.</p><p><a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="margin-top:1rem;">Begin Here</a></p>',
      },
      {
        title: 'The Intake Consultation',
        content: '<p>During intake, we\u2019ll explore what\u2019s bringing you to the divination space \u2014 what questions you carry, what crossroads you\u2019re navigating, and what ancestral or elemental guidance might serve your path.</p>',
      },
      {
        title: 'Preparation',
        content: '<p>Create a quiet, sacred space. Light a candle if it feels right. Sit with your questions beforehand \u2014 not to rehearse them, but to let them settle into your body. The ancestors and elements respond to sincerity, not performance.</p>',
      },
      {
        title: 'The Session',
        content: '<p>A 2-hour virtual session via Zoom. Through various divinatory methods, we\u2019ll open channels of communication with the ancestral and elemental realms. This is not fortune-telling \u2014 it is deep listening to the wisdom that surrounds and precedes you.</p>',
      },
      {
        title: 'Integration',
        content: '<p>After a divination session, messages may continue to arrive through dreams, synchronicities, and quiet knowings. Keep a journal nearby. Be gentle with yourself. The transmission continues well beyond the session itself.</p>',
      },
      {
        title: 'Ongoing & Deeper Work',
        content: '<p>Divination sessions can be booked on an ongoing basis as part of a continuous relationship with the ancestral and elemental realms. They pair naturally with Pl\u00e1ticas for integration and with ceremonial containers for deeper work. <a href="/offerings/">Explore all offerings \u2192</a></p>',
      },
    ],
  },

  {
    id: 'ceremonial-therapeutics',
    slug: 'ceremonial-therapeutics',
    name: 'Ceremonial Therapeutics',
    subtitle: null,
    navLabel: 'Ceremonial Therapeutics',
    duration: '3 hours',
    format: 'In-person',
    formatShort: 'In-person',
    availability: 'Days TBD',
    isGateway: false,
    description: 'A holistic and integrated synergy of Sacramental Entheogenic Breath, Somatic Bodywork, Generative Trance, and Shamanic Guidance in the specialized state of consciousness brought about by these modalities.',
    extendedDescription: 'These sessions are available as single sessions, and also as part of single or multi-season developmental arcs.',
    aftercare: true,
    aftercareNote: 'Schedule 1\u20132 weeks post-session (3 weeks max).',
    scale: {
      patron:        { min: 1800, label: 'Patron',        color: 'patron' },
      abundance:     { min: 1600, label: 'Abundance',      color: 'abundance' },
      community:     { min: 1200, label: 'Community',      color: 'community' },
      accessibility: { min: 800,  label: 'Accessibility',  color: 'accessibility' },
    },
    journeySteps: [
      {
        title: 'Schedule Your Intake Call',
        content: '<p>Every in-person ceremonial experience requires a fresh intake conversation, even for returning clients. This ensures readiness and fit are assessed for this specific container.</p><p><a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="margin-top:1rem;">Begin Here</a></p>',
      },
      {
        title: 'The Intake Consultation',
        content: '<p>We\u2019ll discuss your physical and emotional health, any medications or contraindications, your experience with breathwork and bodywork, and your intentions for this session. Honesty is essential \u2014 your safety is the foundation.</p>',
      },
      {
        title: 'Preparation',
        content: '<p>Preparation protocols will be provided after intake. These typically include dietary guidelines in the days leading up to the session, abstinence from certain substances, and practices for grounding and intention-setting. Detailed preparation materials will be shared.</p>',
      },
      {
        title: 'The Session',
        content: '<p>A 3-hour in-person session weaving sacramental breath, somatic bodywork, generative trance, and shamanic guidance. The session moves through distinct phases, each building on the last. You\u2019ll be held in a safe, sacred container throughout.</p>',
      },
      {
        title: 'Integration',
        content: '<p>The days following a Ceremonial Therapeutics session are sacred time. Rest deeply. Avoid overstimulation. Journal what arises. Your body and psyche are processing \u2014 honor that process with spaciousness and gentleness.</p>',
      },
      {
        title: 'Aftercare Call',
        content: '<p>An aftercare call is included, scheduled 1\u20132 weeks post-session (3 weeks max). We\u2019ll process what emerged, discuss integration practices, and assess next steps. Schedule this call at the time of your booking.</p>',
      },
      {
        title: 'Ongoing & Deeper Work',
        content: '<p>Ceremonial Therapeutics can be experienced as a single session or woven into a longer developmental arc. Many clients find this modality opens doorways that deeper ceremonial immersions can walk through. <a href="/offerings/">Explore all offerings \u2192</a></p>',
      },
    ],
  },

  {
    id: 'ceremonial-immersions',
    slug: 'ceremonial-immersions',
    name: 'Ceremonial Immersions',
    subtitle: null,
    navLabel: 'Ceremonial Immersions',
    duration: '6 hours',
    format: 'In-person',
    formatShort: 'In-person',
    availability: 'Days TBD',
    isGateway: false,
    description: 'A holistic integrated harmony of Sacramental Entheogenic Shamanic Medicine, incorporating Somatic Touch and Inner Wisdom Guidance within a specialized state of consciousness.',
    extendedDescription: 'These trauma-informed and therapeutically-attuned sessions are provided as single sessions, and also available as part of single or multi-season developmental arcs.',
    aftercare: true,
    aftercareNote: 'Schedule 1\u20132 weeks post-session (3 weeks max). Schedule these calls at the time of your booking.',
    scale: {
      patron:        { min: 2200, label: 'Patron',        color: 'patron' },
      abundance:     { min: 1800, label: 'Abundance',      color: 'abundance' },
      community:     { min: 1600, label: 'Community',      color: 'community' },
      accessibility: { min: 1200, label: 'Accessibility',  color: 'accessibility' },
    },
    journeySteps: [
      {
        title: 'Schedule Your Intake Call',
        content: '<p>Every Ceremonial Immersion requires a dedicated intake conversation, regardless of previous experience. The depth of this work demands fresh assessment of readiness, intention, and container fit.</p><p><a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="margin-top:1rem;">Begin Here</a></p>',
      },
      {
        title: 'The Intake Consultation',
        content: '<p>A thorough conversation covering your physical and mental health history, current medications, experience with entheogenic medicines, spiritual practice, life circumstances, and intentions. This assessment is both clinical and intuitive \u2014 we\u2019re listening for readiness on every level.</p>',
      },
      {
        title: 'Preparation',
        content: '<p>Detailed preparation protocols are provided after intake. These include dietary guidelines (typically beginning 1\u20132 weeks before), substance abstinence requirements, physical preparation, intention-setting practices, and logistical details. This is among the most preparation-intensive offerings. Comprehensive materials will be shared.</p>',
      },
      {
        title: 'The Session',
        content: '<p>A 6-hour in-person ceremony integrating sacramental entheogenic medicine, somatic touch, and inner wisdom guidance. The session moves through opening ceremony, medicine journey, somatic integration, and closing. You are held and accompanied throughout the entire experience.</p>',
      },
      {
        title: 'Integration',
        content: '<p>The integration period after a Ceremonial Immersion is substantial. Plan for 2\u20133 days of rest minimum. Avoid major decisions, intense social situations, and substances. Journaling, time in nature, and gentle movement support the process. Detailed integration guidance will be provided.</p>',
      },
      {
        title: 'Aftercare Call',
        content: '<p>An aftercare call is included, scheduled 1\u20132 weeks post-session (3 weeks max). This is a dedicated space to process what emerged, receive guidance on ongoing integration, and discuss how the experience is weaving into your life. Schedule this call at the time of your booking.</p>',
      },
      {
        title: 'Ongoing & Deeper Work',
        content: '<p>Many who experience Ceremonial Immersions are called to longer developmental arcs \u2014 multi-session progressions that deepen the work over months. Ongoing Pl\u00e1ticas and Divination sessions support continued integration. <a href="/offerings/">Explore all offerings \u2192</a></p>',
      },
    ],
  },

  {
    id: 'shamanic-bodywork',
    slug: 'shamanic-bodywork',
    name: 'Shamanic Bodywork',
    subtitle: null,
    navLabel: 'Shamanic Bodywork',
    duration: '6 hours',
    format: 'In-person',
    formatShort: 'In-person',
    availability: 'Days TBD',
    isGateway: false,
    description: 'Deep somatic healing through the body\u2019s living memory \u2014 restoring the sacred conversation between flesh, spirit, and land. The body as altar; sensation as oracle.',
    extendedDescription: 'A 6-hour medicine-supported somatic ceremony.',
    aftercare: true,
    aftercareNote: 'Schedule 1\u20132 weeks post-session (3 weeks max).',
    scale: {
      patron:        { min: 2800, label: 'Patron',        color: 'patron' },
      abundance:     { min: 2400, label: 'Abundance',      color: 'abundance' },
      community:     { min: 2000, label: 'Community',      color: 'community' },
      accessibility: { min: 1600, label: 'Accessibility',  color: 'accessibility' },
    },
    journeySteps: [
      {
        title: 'Schedule Your Intake Call',
        content: '<p>Shamanic Bodywork requires a dedicated intake conversation for every session. The somatic depth of this work demands current assessment of your physical health, emotional state, and readiness.</p><p><a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="margin-top:1rem;">Begin Here</a></p>',
      },
      {
        title: 'The Intake Consultation',
        content: '<p>We\u2019ll discuss your body\u2019s history \u2014 injuries, surgeries, chronic conditions, trauma held in tissue. We\u2019ll also explore your relationship with touch, your experience with bodywork, and what your body is asking for. This conversation is essential to crafting a safe container.</p>',
      },
      {
        title: 'Preparation',
        content: '<p>Preparation protocols will be provided after intake, including dietary guidelines, substance abstinence requirements, body preparation practices, and logistical details. The body needs to be ready to receive this work. Comprehensive materials will be shared.</p>',
      },
      {
        title: 'The Session',
        content: '<p>A 6-hour in-person medicine-supported somatic ceremony. Through intentional touch, energetic work, and shamanic guidance, we engage the body\u2019s living memory. This is not massage \u2014 it is a ceremonial dialogue with the wisdom held in your flesh, bones, and breath.</p>',
      },
      {
        title: 'Integration',
        content: '<p>After Shamanic Bodywork, your body will continue processing for days. Prioritize rest, hydration, and gentle movement. Emotions may surface unexpectedly \u2014 this is the body releasing what it has been holding. Honor whatever arises with patience and compassion.</p>',
      },
      {
        title: 'Aftercare Call',
        content: '<p>An aftercare call is included, scheduled 1\u20132 weeks post-session (3 weeks max). We\u2019ll check in on how your body is integrating, discuss any somatic or emotional experiences that have arisen, and provide continued guidance. Schedule this call at the time of your booking.</p>',
      },
      {
        title: 'Ongoing & Deeper Work',
        content: '<p>Shamanic Bodywork often awakens a deeper calling to ongoing somatic and ceremonial work. It pairs powerfully with Ceremonial Immersions and developmental arcs for those ready to continue the journey. <a href="/offerings/">Explore all offerings \u2192</a></p>',
      },
    ],
  },
];

/** Get an offering by its slug */
export function getOffering(slug) {
  return OFFERINGS.find(o => o.slug === slug) || null;
}

/** Shared policy text displayed on all offering pages */
export const SHARED_POLICIES = {
  paymentPolicy: 'Payment in full at time of booking.',
  scaleNote: 'You\u2019re welcome to offer within or beyond these rates as feels aligned \u2014 balancing accessibility, appreciation, and capacity.',
  limitedSlots: 'I hold a limited number of Accessibility and Community rate sessions each season. These are made possible through Patron and Abundance offerings.',
  reciprocityNote: 'If these tiers are currently beyond your means, please take a moment to review the <a href="/sacred-reciprocity/">Sacred Reciprocity</a> page, and then reach out so we can find a sustainable path together.',
};
