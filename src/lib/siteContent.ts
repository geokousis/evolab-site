export type SiteContentItem = {
  title: string;
  description: string;
};

export type SoftwareItem = {
  id: string;
  title: string;
  description: string;
  link: string;
};

export type LabPhoto = {
  id: string;
  imageUrl: string;
  storagePath: string | null;
  caption: string;
  alt: string;
};

export type DissertationItem = {
  id: string;
  student: string;
  title: string;
  year: string;
  type: 'phd' | 'msc';
  link: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  link: string;
};

export type SiteContent = {
  id: string;
  // Our Goal
  goal_intro_primary: string;
  goal_intro_secondary: string;
  goal_focus_items: SiteContentItem[];
  // Members
  members_lead: string;
  // Software
  software_lead: string;
  software_items: SoftwareItem[];
  // Teaching
  teaching_lead: string;
  teaching_items: SiteContentItem[];
  // Lab Photos
  lab_photos: LabPhoto[];
  // Dissertations
  dissertations_lead: string;
  dissertation_items: DissertationItem[];
  // Resources (links with description, e.g. Google Drive, shared docs)
  resources_lead: string;
  resource_items: ResourceItem[];
  // Contact
  contact_lead: string;
  contact_email: string;
  contact_phone: string;
  contact_location: string;
};

export const defaultSiteContent: SiteContent = {
  id: 'default',
  goal_intro_primary:
    'EvoLab at FORTH-ICS studies how evolutionary forces shape genetic variability across populations. We build algorithms, analysis pipelines, and computational tools for population genomics, natural selection, demographic history, and reproducible evolutionary inference.',
  goal_intro_secondary:
    'Our work spans organisms from A. thaliana to H. sapiens and connects methods development with real genomic data. The lab is based at the Institute of Computer Science, Foundation for Research and Technology - Hellas.',
  goal_focus_items: [
    { title: 'Evolutionary Inference', description: 'Models and tools for selection, drift, population structure, and demographic history.' },
    { title: 'Computational Genomics', description: 'Efficient pipelines for whole-genome data, reproducible analysis, and validation.' },
    { title: 'Research Translation', description: 'Open software and collaborative studies that connect theory with biological datasets.' },
  ],
  members_lead: 'A collaborative team across evolutionary biology, genomics, and quantitative analysis.',
  software_lead: 'Open-source tools developed by EvoLab @ FORTH-ICS for population genomics, evolutionary analysis, and selective sweep detection.',
  software_items: [
    {
      id: 'sw-raisd',
      title: 'RAiSD',
      description: 'Raised Accuracy in Sweep Detection. Detects selective sweeps by combining all three known signatures — SFS, LD, and fixation index — using SNP vectors for whole-genome analysis.',
      link: 'https://github.com/alachins/raisd',
    },
    {
      id: 'sw-sweed',
      title: 'SweeD',
      description: 'Parallel and checkpointable tool implementing a composite likelihood ratio test for selective sweep detection based on the Site Frequency Spectrum (SFS). Up to 21× faster than SweepFinder on large datasets.',
      link: 'https://github.com/alachins/sweed',
    },
    {
      id: 'sw-omegaplus',
      title: 'OmegaPlus',
      description: 'Scalable parallel tool for detecting selective sweeps in whole-genome data using linkage disequilibrium patterns (omega-statistic). Works with phased and unphased data; no outgroup required.',
      link: 'https://github.com/alachins/omegaplus',
    },
    {
      id: 'sw-comus',
      title: 'CoMuS',
      description: 'Coalescent of Multiple Species. Simulation software for simultaneous modeling of modern and ancestral samples, supporting recombination, mutation, migration, and ABC-based parameter inference.',
      link: 'https://github.com/idaios/comus',
    },
    {
      id: 'sw-prins',
      title: 'PRInS',
      description: 'Protein Residues Interaction Statistics. Identifies functionally important amino acids by scoring interaction frequencies in protein tertiary structures. Trained on known structures to highlight evolutionarily conserved residues.',
      link: 'https://pop-gen.eu/wordpress/software/',
    },
    {
      id: 'sw-sps',
      title: 'SPS',
      description: 'Forward-backward spatial simulator for genetic data. Models genomic patterns arising from spatially structured populations.',
      link: 'https://github.com/aggelosk/Sps',
    },
    {
      id: 'sw-feg',
      title: 'FEG',
      description: 'Forward Evolutionary Game simulator. Studies genomic footprints of behavioral selection using a predator-prey model in a spatial framework.',
      link: 'https://github.com/aggelosk/game',
    },
  ],
  teaching_lead: 'Training the next generation through courses, mentoring, and open practical workshops.',
  teaching_items: [
    { title: 'Graduate Modules', description: 'Population genomics, evolutionary modeling, and reproducible quantitative workflows.' },
    { title: 'Hands-On Training', description: 'Live coding sessions for analysis pipelines, statistical validation, and interpretation.' },
    { title: 'Mentorship', description: 'Research supervision and project design support for students across career stages.' },
  ],
  lab_photos: [],
  dissertations_lead: 'PhD and MSc dissertations completed under EvoLab supervision.',
  dissertation_items: [],
  resources_lead: 'Shared documents, datasets, and materials related to lab research.',
  resource_items: [],
  contact_lead: 'Reach out for collaboration, student opportunities, or invited talks.',
  contact_email: 'contact@evolab.org',
  contact_phone: '+1 (000) 000-0000',
  contact_location: 'Department of Evolutionary Biology, University Campus',
};

const coerceItems = (value: unknown, fallback: SiteContentItem[]) => {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const items = value
    .map((item, index) => ({
      title: typeof item?.title === 'string' ? item.title : fallback[index]?.title ?? '',
      description: typeof item?.description === 'string' ? item.description : fallback[index]?.description ?? '',
    }))
    .filter((item) => item.title || item.description);
  return items.length > 0 ? items : fallback;
};

const coerceSoftware = (value: unknown): SoftwareItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.title).map((item) => ({
    id: item.id ?? `sw-${Math.random().toString(36).slice(2)}`,
    title: item.title ?? '',
    description: item.description ?? '',
    link: item.link ?? '',
  }));
};

const coercePhotos = (value: unknown): LabPhoto[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.imageUrl).map((item) => ({
    id: item.id ?? `photo-${Math.random().toString(36).slice(2)}`,
    imageUrl: item.imageUrl ?? '',
    storagePath: item.storagePath ?? null,
    caption: item.caption ?? '',
    alt: item.alt ?? '',
  }));
};

const coerceResources = (value: unknown): ResourceItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.title || item?.link).map((item) => ({
    id: item.id ?? `res-${Math.random().toString(36).slice(2)}`,
    title: item.title ?? '',
    description: item.description ?? '',
    link: item.link ?? '',
  }));
};

const coerceDissertations = (value: unknown): DissertationItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.student || item?.title).map((item) => ({
    id: item.id ?? `diss-${Math.random().toString(36).slice(2)}`,
    student: item.student ?? '',
    title: item.title ?? '',
    year: item.year ?? '',
    type: item.type === 'msc' ? 'msc' : 'phd',
    link: item.link ?? '',
  }));
};

export const normalizeSiteContent = (input?: Partial<SiteContent> | null): SiteContent => {
  if (!input) return defaultSiteContent;
  return {
    ...defaultSiteContent,
    ...input,
    goal_focus_items: coerceItems(input.goal_focus_items, defaultSiteContent.goal_focus_items),
    teaching_items: coerceItems(input.teaching_items, defaultSiteContent.teaching_items),
    software_items: coerceSoftware(input.software_items),
    lab_photos: coercePhotos(input.lab_photos),
    dissertation_items: coerceDissertations(input.dissertation_items),
    resource_items: coerceResources(input.resource_items),
  };
};
