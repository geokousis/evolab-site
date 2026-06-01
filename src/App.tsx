import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase, Member, Project, Publication } from './lib/supabase';
import { defaultSiteContent, normalizeSiteContent, SiteContent } from './lib/siteContent';
import { LabSlideshow } from './components/LabSlideshow';
import { EvoBackground } from './components/EvoBackground';
import { FormattedText } from './components/FormattedText';
import {
  ExternalLink,
  X,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

type StepId = 'our-goal' | 'members' | 'projects' | 'papers' | 'teaching' | 'contact';
type DisplayMember = Member & { photo_url?: string | null };
type ProjectLink = { label: string; url: string };
type DisplayProject = Project & { links?: ProjectLink[] };
type DisplayPublication = Publication & { citations?: number | null; display_order?: number };
type ScholarMetrics = {
  totalCitations: number | null;
  citationsSincePeriod: number | null;
  hIndex: number | null;
  hIndexSincePeriod: number | null;
  i10Index: number | null;
  i10IndexSincePeriod: number | null;
};

type ScholarCache = {
  syncedAt?: string;
  metrics?: ScholarMetrics;
  publications?: DisplayPublication[];
};
const PAPER_LIMIT = 9;
const treeSteps: { id: StepId; label: string }[] = [
  { id: 'our-goal', label: 'Our Goal' },
  { id: 'members',  label: 'Members' },
  { id: 'projects', label: 'Projects' },
  { id: 'papers',   label: 'Papers' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'contact',  label: 'Contact' },
];

const treeNodes: { id: StepId; short: string; x: number; y: number; activeAt: number }[] = [
  { id: 'our-goal', short: 'GOAL',     x: 520,  y: 300, activeAt: 0 },
  { id: 'members',  short: 'MEMBERS',  x: 760,  y: 430, activeAt: 1 },
  { id: 'projects', short: 'PROJECTS', x: 980,  y: 560, activeAt: 2 },
  { id: 'papers',   short: 'PAPERS',   x: 1160, y: 660, activeAt: 3 },
  { id: 'teaching', short: 'TEACHING', x: 1240, y: 730, activeAt: 4 },
  { id: 'contact',  short: 'CONTACT',  x: 1280, y: 820, activeAt: 5 },
];

const treeBranches = [
  { x1: 430, y1: 720, x2: 520,  y2: 300, activeAt: 0 },
  { x1: 430, y1: 720, x2: 660,  y2: 560, activeAt: 1 },
  { x1: 660, y1: 560, x2: 760,  y2: 430, activeAt: 1 },
  { x1: 660, y1: 560, x2: 900,  y2: 610, activeAt: 2 },
  { x1: 900, y1: 610, x2: 980,  y2: 560, activeAt: 2 },
  { x1: 900, y1: 610, x2: 1100, y2: 700, activeAt: 3 },
  { x1: 1100, y1: 700, x2: 1160, y2: 660, activeAt: 3 },
  { x1: 1100, y1: 700, x2: 1195, y2: 760, activeAt: 4 },
  { x1: 1195, y1: 760, x2: 1240, y2: 730, activeAt: 4 },
  { x1: 1195, y1: 760, x2: 1280, y2: 820, activeAt: 5 },
] as const;

const mobileTreeNodes: { id: StepId; short: string; x: number; y: number; activeAt: number }[] = [
  { id: 'our-goal', short: 'GOAL',  x: 62,  y: 22, activeAt: 0 },
  { id: 'members',  short: 'MEM',   x: 132, y: 34, activeAt: 1 },
  { id: 'projects', short: 'PROJ',  x: 224, y: 58, activeAt: 2 },
  { id: 'papers',   short: 'PAP',   x: 286, y: 72, activeAt: 3 },
  { id: 'teaching', short: 'TEACH', x: 352, y: 56, activeAt: 4 },
  { id: 'contact',  short: 'CONT',  x: 376, y: 96, activeAt: 5 },
];

const mobileTreeBranches = [
  { x1: 20, y1: 95, x2: 62,  y2: 22, activeAt: 0 },
  { x1: 20, y1: 95, x2: 90,  y2: 70, activeAt: 1 },
  { x1: 90, y1: 70, x2: 132, y2: 34, activeAt: 1 },
  { x1: 90, y1: 70, x2: 186, y2: 76, activeAt: 2 },
  { x1: 186, y1: 76, x2: 224, y2: 58, activeAt: 2 },
  { x1: 186, y1: 76, x2: 242, y2: 86, activeAt: 3 },
  { x1: 242, y1: 86, x2: 286, y2: 72, activeAt: 3 },
  { x1: 242, y1: 86, x2: 316, y2: 78, activeAt: 4 },
  { x1: 316, y1: 78, x2: 352, y2: 56, activeAt: 4 },
  { x1: 316, y1: 78, x2: 376, y2: 96, activeAt: 5 },
] as const;

const demoMembers: DisplayMember[] = [
  {
    id: 'demo-1',
    name: 'Elena K. Markou',
    role: 'Principal Investigator',
    description:
      'Leads research on evolutionary genomics, population structure, and model-based inference.',
    is_current: true,
    cv_link: null,
    photo_url: '/demo-members/elena.svg',
    display_order: 1,
  },
  {
    id: 'demo-2',
    name: 'Nikos Arvanitis',
    role: 'Postdoctoral Fellow',
    description:
      'Develops robust analysis pipelines for genome-wide selection and recombination signals.',
    is_current: true,
    cv_link: null,
    photo_url: '/demo-members/nikos.svg',
    display_order: 2,
  },
  {
    id: 'demo-3',
    name: 'Maria Tsioti',
    role: 'PhD Candidate',
    description:
      'Works on statistical frameworks for demographic history and uncertainty-aware inference.',
    is_current: true,
    cv_link: null,
    photo_url: '/demo-members/maria.svg',
    display_order: 3,
  },
  {
    id: 'demo-4',
    name: 'Yannis Petrou',
    role: 'Research Engineer',
    description:
      'Builds reproducible computational workflows, tooling, and internal data infrastructure.',
    is_current: true,
    cv_link: null,
    photo_url: '/demo-members/yannis.svg',
    display_order: 4,
  },
];

const fallbackPastProjects: DisplayProject[] = [
  {
    id: 'past-raisd',
    title: 'RAiSD: Selective Sweep Detection based on Multiple Signatures',
    description:
      'RAiSD (Raised Accuracy in Sweep Detection) is a stand-alone implementation of the mu statistic for selective sweep detection. It scans whole-genome SNP data with a composite evaluation scheme that captures multiple sweep signatures at once.',
    status: 'past',
    start_year: 2018,
    end_year: 2018,
    display_order: 1,
    links: [
      {
        label: 'RAiSD communications biology article',
        url: 'https://www.nature.com/articles/s42003-018-0085-8',
      },
      {
        label: 'Accelerated inference publication',
        url: 'https://ieeexplore.ieee.org/abstract/document/8533493',
      },
      { label: 'GitHub: alachins/raisd', url: 'https://github.com/alachins/raisd' },
    ],
  },
  {
    id: 'past-sweed',
    title: 'SweeD: Selective Sweep Detection based on SFS',
    description:
      'SweeD implements a composite likelihood ratio test to detect selective sweeps from whole-genome data.',
    status: 'past',
    start_year: 2013,
    end_year: 2013,
    display_order: 2,
    links: [
      {
        label: 'SweeD MBE publication (DOI)',
        url: 'https://doi.org/10.1093/molbev/mst112',
      },
      { label: 'GitHub: alachins/sweed', url: 'https://github.com/alachins/sweed' },
    ],
  },
  {
    id: 'past-omegaplus',
    title: 'OmegaPlus: Selective Sweep Detection based on LD',
    description:
      'OmegaPlus detects selective sweeps using the omega-statistic, which highlights neighboring regions with high internal LD and lower LD between them.',
    status: 'past',
    start_year: 2012,
    end_year: 2012,
    display_order: 3,
    links: [
      {
        label: 'OmegaPlus Bioinformatics publication',
        url: 'https://academic.oup.com/bioinformatics/article/28/17/2274/245799',
      },
      { label: 'GitHub: alachins/omegaplus', url: 'https://github.com/alachins/omegaplus' },
    ],
  },
  {
    id: 'past-msabc',
    title: 'Demography Inference (ABC)',
    description:
      "Demography inference helps reconstruct species history and disentangle demography from selection. We implemented msABC as a modification of Hudson's ms to facilitate multi-locus ABC analysis.",
    status: 'past',
    start_year: 2010,
    end_year: 2010,
    display_order: 4,
    links: [
      {
        label: 'msABC Molecular Ecology Resources publication',
        url: 'https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1755-0998.2010.02832.x',
      },
      { label: 'GitHub: idaios/msABC', url: 'https://github.com/idaios/msABC' },
    ],
  },
  {
    id: 'past-sps',
    title: 'SPS: Forward-Backward Spatial Simulator for Genetic Data',
    description:
      'Forward-backward simulator for genetic data in a spatial framework, used to explore genomic patterns that emerge from spatially structured populations.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 5,
    links: [{ label: 'GitHub: aggelosk/Sps', url: 'https://github.com/aggelosk/Sps' }],
  },
  {
    id: 'past-feg',
    title: 'FEG: Forward Evolutionary Game Simulator',
    description:
      'Forward spatial simulator with a predator-prey model used to study genomic footprints of behavioral selection.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 6,
    links: [{ label: 'GitHub: aggelosk/game', url: 'https://github.com/aggelosk/game' }],
  },
  {
    id: 'past-evonet',
    title: 'EVONET: Evolution of Gene Regulatory Networks',
    description:
      'Evonet simulates GRN evolution under genetic drift and selection, extending boolean GRN ideas with two regulatory regions per gene and a C implementation for speed and compatibility.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 7,
    links: [{ label: 'GitHub: antokioukis/evonet', url: 'https://github.com/antokioukis/evonet' }],
  },
  {
    id: 'past-endogenous-virus',
    title: 'Endogenous Virus Evolution',
    description:
      'This project identifies endogenous retrovirus DNA copies in host genomes, reconstructs lineage relationships, and assesses nearby gene mutations and potential consequences.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 8,
  },
  {
    id: 'past-mito-nuclear',
    title: 'Mitochondrial-Nuclear Genes Co-Evolution',
    description:
      'Project focused on coordinated evolutionary dynamics between mitochondrial and nuclear genetic systems.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 9,
  },
  {
    id: 'past-hic-3d-dna',
    title: 'HiC Data Analysis - Evolution of DNA 3D Structure',
    description:
      'We analyzed TF and histone modifier binding relative to LAD/TAD boundaries, TSS distributions (GENCODE), transcript types, and evolutionary patterns in human and mouse populations. We also examined older selective signatures using dN/dS for genes inside versus outside LAD/TAD contexts.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 10,
  },
  {
    id: 'past-population-metagenomics',
    title: 'Population Metagenomics',
    description:
      'Past research activity on evolutionary signals and population-level variation in metagenomic contexts.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 11,
  },
  {
    id: 'past-aa-neighborhood-models',
    title: 'Evolutionary Models of Amino Acid Substitutions based on Neighborhood Tertiary Structure',
    description:
      'Using the PrInS algorithm, we quantified amino acid interactions from protein structures, derived scoring matrices, and compared them against substitution models such as BLOSUM62 and PAM120 for protein evolution prediction.',
    status: 'past',
    start_year: null,
    end_year: null,
    display_order: 12,
  },
];

function App() {
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [projects, setProjects] = useState<DisplayProject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [scholarMetrics, setScholarMetrics] = useState<ScholarMetrics | null>(null);
  const [scholarPublications, setScholarPublications] = useState<DisplayPublication[]>([]);
  const [selectedMember, setSelectedMember] = useState<DisplayMember | null>(null);
  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [projectFilter, setProjectFilter] = useState<'active' | 'past' | 'software'>('past');
  const [paperFilter, setPaperFilter] = useState<'publications' | 'dissertations'>('publications');
  const [memberFilter, setMemberFilter] = useState<'active' | 'former'>('active');
  const [activeStep, setActiveStep] = useState<StepId>('our-goal');
  const [revealedSteps, setRevealedSteps] = useState<Set<StepId>>(() => new Set(['our-goal']));

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-tree-section]');
    const ratios = new Map<StepId, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id as StepId;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId: StepId = 'our-goal';
        let bestRatio = 0;

        treeSteps.forEach((step) => {
          const ratio = ratios.get(step.id) ?? 0;
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            bestId = step.id;
          }
        });

        if (bestRatio > 0) {
          setActiveStep(bestId);
          setRevealedSteps((prev) => {
            if (prev.has(bestId)) return prev;
            const next = new Set(prev);
            next.add(bestId);
            return next;
          });
        }
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.7],
        rootMargin: '-18% 0px -28% 0px',
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [members.length, projects.length, publications.length, projectFilter]);

  const fetchData = async () => {
    const [membersRes, projectsRes, publicationsRes, siteContentRes, scholarRes] = await Promise.all([
      supabase.from('members').select('*').order('display_order'),
      supabase.from('projects').select('*').order('display_order'),
      supabase.from('publications').select('*').order('year', { ascending: false }),
      supabase.from('site_content').select('*').order('id'),
      fetch('/data/scholar-cache.json', { cache: 'no-store' }).catch(() => null),
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data as DisplayProject[]);
    if (publicationsRes.data) setPublications(publicationsRes.data);
    if (siteContentRes.data && siteContentRes.data.length > 0) {
      setSiteContent(siteContentRes.data[0]);
    } else {
      setSiteContent(defaultSiteContent);
    }

    if (scholarRes && scholarRes.ok) {
      const cache = (await scholarRes.json()) as ScholarCache;
      if (cache.metrics) {
        setScholarMetrics(cache.metrics);
      }
      if (Array.isArray(cache.publications)) {
        setScholarPublications(cache.publications);
      }
    }
  };

  const resolvedSiteContent = useMemo(() => normalizeSiteContent(siteContent), [siteContent]);

  const publicationsWithCitations = useMemo<DisplayPublication[]>(() => {
    if (scholarPublications.length > 0) {
      return scholarPublications;
    }

    if (publications.length > 0) {
      return publications.map((pub) => ({
        ...pub,
        citations: null,
      }));
    }

    return scholarPublications;
  }, [publications, scholarPublications]);

  const sanitizeText = (value: string | null | undefined) => {
    const text = String(value || '').trim();
    return text.toLowerCase() === 'unknown' ? '' : text;
  };

  const publicationHref = (pub: DisplayPublication) => {
    if (pub.link) return pub.link;
    if (pub.doi) return `https://doi.org/${pub.doi}`;

    const rawId = String(pub.id || '');
    if (rawId.startsWith('scholar-')) {
      const citationForView = rawId.slice('scholar-'.length);
      const user = citationForView.split(':')[0];
      if (citationForView.includes(':') && user) {
        return `https://scholar.google.com/citations?view_op=view_citation&hl=en&user=${encodeURIComponent(user)}&citation_for_view=${encodeURIComponent(citationForView)}`;
      }
    }

    return null;
  };

  const latestPublications = useMemo<DisplayPublication[]>(() => {
    const normalized = publicationsWithCitations
      .map((pub) => ({
        ...pub,
        authors: sanitizeText(pub.authors),
        journal: sanitizeText(pub.journal),
      }))
      .filter((pub) => String(pub.title || '').trim().length > 0);

    if (scholarPublications.length > 0) {
      return normalized
        .sort((a, b) => {
          const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        })
        .slice(0, PAPER_LIMIT);
    }

    return normalized
      .sort((a, b) => {
        const yearDiff = (b.year || 0) - (a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, PAPER_LIMIT);
  }, [publicationsWithCitations, scholarPublications.length]);

  const latestClickablePublications = useMemo<DisplayPublication[]>(() => {
    return latestPublications.filter((pub) => Boolean(publicationHref(pub))).slice(0, PAPER_LIMIT);
  }, [latestPublications]);

  const currentMembers = members.filter((member) => member.is_current);
  const pastMembers = members.filter((member) => !member.is_current);
  const activeProjects = projects.filter((project) => project.status === 'active');
  const pastProjects = projects.filter((project) => project.status === 'past');
  const pastProjectsWithFallback = useMemo(() => {
    const seen = new Set<string>();
    return [...pastProjects, ...fallbackPastProjects].filter((project) => {
      const key = project.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pastProjects]);
  const filteredProjects =
    projectFilter === 'past'
      ? pastProjectsWithFallback
      : projectFilter === 'active'
      ? activeProjects
      : [];

  const activeIndex = useMemo(
    () => Math.max(treeSteps.findIndex((step) => step.id === activeStep), 0),
    [activeStep]
  );

  const jumpToSection = (stepId: StepId) => {
    const target = document.getElementById(stepId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const memberInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const memberPhoto = (member: DisplayMember) => {
    return member.photo_url || null;
  };

  const renderTreeTip = (node: (typeof treeNodes)[number], isActive: boolean) => (
    <g
      key={node.id}
      className="tree-tip"
      role="link"
      tabIndex={0}
      aria-label={`Go to ${treeSteps.find((step) => step.id === node.id)?.label ?? node.short}`}
      onClick={() => jumpToSection(node.id)}
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          jumpToSection(node.id);
        }
      }}
    >
      <circle cx={node.x} cy={node.y} r="30" className="tree-hit-area" />
      <circle cx={node.x} cy={node.y} r="13" className={`tree-node ${isActive ? 'is-active' : ''}`} />
      <text x={node.x + 18} y={node.y + 5} className={`tree-label ${isActive ? 'is-active' : ''}`}>
        {node.short}
      </text>
    </g>
  );

  const renderMobileTreeTip = (node: (typeof mobileTreeNodes)[number], isActive: boolean) => (
    <g
      key={node.id}
      className="mobile-tree-tip"
      role="link"
      tabIndex={0}
      aria-label={`Go to ${treeSteps.find((step) => step.id === node.id)?.label ?? node.short}`}
      onClick={() => jumpToSection(node.id)}
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          jumpToSection(node.id);
        }
      }}
    >
      <circle cx={node.x} cy={node.y} r="13.5" className="mobile-tree-hit-area" />
      <circle cx={node.x} cy={node.y} r="5.4" className={`mobile-tree-node ${isActive ? 'is-active' : ''}`} />
      <text x={node.x + 7} y={node.y - 8} className={`mobile-tree-text ${isActive ? 'is-active' : ''}`}>
        {node.short}
      </text>
    </g>
  );

  return (
    <div className={`site-shell step-${activeStep}`}>
      <header className="topbar">
        <div className="page-wrap topbar-row">
          <a href="#top" className="brand">EvoLab</a>
        </div>
        <nav className="mobile-tree-nav" aria-label="Tree navigation">
          <div className="page-wrap mobile-tree-wrap">
            <svg
              className="mobile-tree-canvas"
              viewBox="0 0 392 118"
              preserveAspectRatio="xMinYMid meet"
              role="img"
              aria-label="Mobile phylogenetic tree navigation"
            >
              {mobileTreeBranches
                .filter((branch) => branch.activeAt > activeIndex)
                .map((branch) => (
                  <line
                    key={`mobile-branch-${branch.x1}-${branch.y1}-${branch.x2}-${branch.y2}`}
                    x1={branch.x1}
                    y1={branch.y1}
                    x2={branch.x2}
                    y2={branch.y2}
                    className="mobile-tree-branch"
                  />
                ))}

              {mobileTreeBranches
                .filter((branch) => branch.activeAt <= activeIndex)
                .map((branch) => (
                  <line
                    key={`mobile-branch-${branch.x1}-${branch.y1}-${branch.x2}-${branch.y2}`}
                    x1={branch.x1}
                    y1={branch.y1}
                    x2={branch.x2}
                    y2={branch.y2}
                    className="mobile-tree-branch is-active"
                  />
                ))}

              {mobileTreeNodes
                .filter((node) => node.activeAt > activeIndex)
                .map((node) => renderMobileTreeTip(node, false))}

              {mobileTreeNodes
                .filter((node) => node.activeAt <= activeIndex)
                .map((node) => renderMobileTreeTip(node, true))}
            </svg>
          </div>
        </nav>
      </header>

      <div className="phylo-right">
        <svg
          viewBox="0 0 1360 980"
          preserveAspectRatio="xMaxYMid meet"
          role="img"
          aria-label="Phylogenetic tree navigation"
        >
          {treeBranches
            .filter((branch) => branch.activeAt > activeIndex)
            .map((branch) => (
              <line
                key={`branch-${branch.x1}-${branch.y1}-${branch.x2}-${branch.y2}`}
                x1={branch.x1}
                y1={branch.y1}
                x2={branch.x2}
                y2={branch.y2}
                className="tree-branch"
              />
            ))}

          {treeBranches
            .filter((branch) => branch.activeAt <= activeIndex)
            .map((branch) => (
              <line
                key={`branch-${branch.x1}-${branch.y1}-${branch.x2}-${branch.y2}`}
                x1={branch.x1}
                y1={branch.y1}
                x2={branch.x2}
                y2={branch.y2}
                className="tree-branch is-active"
              />
            ))}

          {treeNodes
            .filter((node) => node.activeAt > activeIndex)
            .map((node) => renderTreeTip(node, false))}

          {treeNodes
            .filter((node) => node.activeAt <= activeIndex)
            .map((node) => renderTreeTip(node, true))}
        </svg>
      </div>

      <main id="top" className="tree-content">
        <section
          id="our-goal"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'our-goal' ? 'is-active' : ''} ${revealedSteps.has('our-goal') ? 'is-revealed' : ''}`}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <EvoBackground />
          <div className="section-page goal-page" style={{ position: 'relative', zIndex: 1 }}>
            <div className="goal-lab-hero">
              <p className="lab-name" aria-label="EvoLab">
                <span className="lab-name-text" aria-hidden="true">
                  <span className="lab-word lab-word-evo">
                    {'Evo'.split('').map((letter, index) => (
                      <span
                        key={`evo-${letter}-${index}`}
                        className="lab-letter"
                        style={{ '--letter-index': index } as CSSProperties}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                  <span className="lab-word lab-word-lab">Lab</span>
                </span>
              </p>
            </div>

            <div className="goal-copy">
              <h2>Our Goal</h2>
              <FormattedText text={resolvedSiteContent.goal_intro_primary} className="section-lead" />
              <FormattedText text={resolvedSiteContent.goal_intro_secondary} className="section-lead" />
            </div>

            <div className="goal-grid goal-focus-grid">
              {resolvedSiteContent.goal_focus_items.map((item, index) => (
                <article className="feature-item feature-item--quote" key={`${item.title}-${index}`}>
                  <FormattedText text={item.description} className="feature-quote" />
                  {item.title && <p className="feature-author">— {item.title}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="members"
          data-tree-section
          className={`tree-section section-light ${activeStep === 'members' ? 'is-active' : ''} ${revealedSteps.has('members') ? 'is-revealed' : ''}`}
        >
          <div className="section-page">
            <h2>Members</h2>
            <FormattedText text={resolvedSiteContent.members_lead} className="section-lead" />

            <div className="filter-row" role="tablist" aria-label="Members filter">
              <button
                onClick={() => setMemberFilter('active')}
                className={`filter-pill ${memberFilter === 'active' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={memberFilter === 'active'}
              >
                Active
              </button>
              <button
                onClick={() => setMemberFilter('former')}
                className={`filter-pill ${memberFilter === 'former' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={memberFilter === 'former'}
              >
                Former
              </button>
            </div>

            <div className="tab-panel">
              {memberFilter === 'active' ? (
                <div className="member-grid reveal-grid">
                  {(currentMembers.length > 0 ? currentMembers : demoMembers).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="member-item"
                    >
                      <div className="member-head">
                        <span className="member-avatar" aria-hidden="true">
                          {memberPhoto(member) ? (
                            <img src={memberPhoto(member) ?? ''} alt="" className="member-avatar-image" loading="lazy" />
                          ) : (
                            memberInitials(member.name)
                          )}
                        </span>
                        <div className="member-meta">
                          <h3>{member.name}</h3>
                          <p className="member-role">{member.role}</p>
                        </div>
                      </div>
                      <p className="member-summary">{member.description}</p>
                    </button>
                  ))}
                </div>
              ) : pastMembers.length > 0 ? (
                <div className="member-grid reveal-grid">
                  {pastMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="member-item"
                    >
                      <div className="member-head">
                        <span className="member-avatar" aria-hidden="true">
                          {memberPhoto(member) ? (
                            <img src={memberPhoto(member) ?? ''} alt="" className="member-avatar-image" loading="lazy" />
                          ) : (
                            memberInitials(member.name)
                          )}
                        </span>
                        <div className="member-meta">
                          <h3>{member.name}</h3>
                          <p className="member-role">{member.role}</p>
                        </div>
                      </div>
                      <p className="member-summary">{member.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No former members listed yet.</p>
              )}
            </div>

            {resolvedSiteContent.lab_photos.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 className="subsection-title">Lab Photos</h3>
                <LabSlideshow photos={resolvedSiteContent.lab_photos} />
              </div>
            )}
          </div>
        </section>

        <section
          id="projects"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'projects' ? 'is-active' : ''} ${revealedSteps.has('projects') ? 'is-revealed' : ''}`}
        >
          <div className="section-page">
            <h2>Projects</h2>

            <div className="filter-row" role="tablist" aria-label="Project filter">
              <button
                onClick={() => setProjectFilter('active')}
                className={`filter-pill ${projectFilter === 'active' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={projectFilter === 'active'}
              >
                Active
              </button>
              <button
                onClick={() => setProjectFilter('past')}
                className={`filter-pill ${projectFilter === 'past' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={projectFilter === 'past'}
              >
                Completed
              </button>
              <button
                onClick={() => setProjectFilter('software')}
                className={`filter-pill ${projectFilter === 'software' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={projectFilter === 'software'}
              >
                Software
              </button>
            </div>

            <div className="tab-panel">
              {projectFilter === 'software' ? (
                resolvedSiteContent.software_items.length > 0 ? (
                  <div className="project-grid reveal-grid">
                    {resolvedSiteContent.software_items.map((tool) => (
                      <a
                        key={tool.id}
                        href={tool.link || undefined}
                        target={tool.link ? '_blank' : undefined}
                        rel={tool.link ? 'noopener noreferrer' : undefined}
                        className={`project-item project-item-compact${tool.link ? ' project-trigger' : ''}`}
                      >
                        <h3>{tool.title}</h3>
                        <p className="project-summary">{tool.description}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No software tools listed yet.</p>
                )
              ) : filteredProjects.length > 0 ? (
                <div className="project-grid reveal-grid">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="project-item project-item-compact project-trigger"
                      onClick={() => setSelectedProject(project)}
                    >
                      <p className="project-years">
                        {project.start_year
                          ? `${project.start_year} - ${project.end_year || 'Present'}`
                          : 'Ongoing'}
                      </p>
                      <h3>{project.title}</h3>
                      <p className="project-summary">{project.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No {projectFilter} projects available yet.</p>
              )}
            </div>
          </div>
        </section>

        <section
          id="papers"
          data-tree-section
          className={`tree-section section-light ${activeStep === 'papers' ? 'is-active' : ''} ${revealedSteps.has('papers') ? 'is-revealed' : ''}`}
        >
          <div className="section-page">
            <h2>Papers</h2>

            {scholarMetrics && (
              <p className="section-lead" style={{ visibility: paperFilter === 'publications' ? 'visible' : 'hidden' }}>
                Citations: {scholarMetrics.totalCitations ?? '-'} · h-index: {scholarMetrics.hIndex ?? '-'} · i10-index: {scholarMetrics.i10Index ?? '-'}
              </p>
            )}

            <div className="filter-row" role="tablist" aria-label="Papers filter">
              <button
                onClick={() => setPaperFilter('publications')}
                className={`filter-pill ${paperFilter === 'publications' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={paperFilter === 'publications'}
              >
                Publications
              </button>
              <button
                onClick={() => setPaperFilter('dissertations')}
                className={`filter-pill ${paperFilter === 'dissertations' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={paperFilter === 'dissertations'}
              >
                Dissertations
              </button>
            </div>

            <div className="tab-panel">
              {paperFilter === 'publications' ? (
                latestClickablePublications.length > 0 ? (
                  <div className="paper-grid reveal-grid">
                    {latestClickablePublications.map((pub, index) => {
                      const baseMeta = [pub.journal, pub.year > 0 ? String(pub.year) : '']
                        .filter(Boolean)
                        .join(' · ');
                      const paperHref = publicationHref(pub);
                      if (!paperHref) return null;
                      return (
                        <a
                          key={`${pub.id || 'paper'}-${index}`}
                          href={paperHref ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="paper-item paper-trigger"
                        >
                          <h3>{pub.title}</h3>
                          {pub.authors && <p>{pub.authors}</p>}
                          {(baseMeta || pub.doi || typeof pub.citations === 'number') && (
                            <p className="project-years">
                              {baseMeta}
                              {pub.doi && <>{baseMeta ? ' · ' : ''}DOI: {pub.doi}</>}
                              {typeof pub.citations === 'number' && (
                                <>{baseMeta || pub.doi ? ' · ' : ''}Cited by {pub.citations}</>
                              )}
                            </p>
                          )}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-message">Papers will appear here soon.</p>
                )
              ) : (
                resolvedSiteContent.dissertation_items.length > 0 ? (
                  <div className="paper-grid reveal-grid">
                    {resolvedSiteContent.dissertation_items.map((diss) => {
                      const meta = [diss.type.toUpperCase(), diss.year].filter(Boolean).join(' · ');
                      if (diss.link) {
                        return (
                          <a
                            key={diss.id}
                            href={diss.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="paper-item paper-trigger"
                          >
                            <h3>{diss.title}</h3>
                            {diss.student && <p>{diss.student}</p>}
                            {meta && <p className="project-years">{meta}</p>}
                          </a>
                        );
                      }
                      return (
                        <article key={diss.id} className="paper-item">
                          <h3>{diss.title}</h3>
                          {diss.student && <p>{diss.student}</p>}
                          {meta && <p className="project-years">{meta}</p>}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-message">No dissertations listed yet.</p>
                )
              )}
            </div>

            {resolvedSiteContent.resource_items.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <h3 className="subsection-title">Resources</h3>
                <p className="section-lead" style={{ marginBottom: 20 }}>{resolvedSiteContent.resources_lead}</p>
                <div className="resource-list reveal-grid">
                  {resolvedSiteContent.resource_items.map((res) => (
                    <a
                      key={res.id}
                      href={res.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-item"
                    >
                      <div className="resource-icon">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                      <div className="resource-body">
                        <p className="resource-title">{res.title}</p>
                        {res.description && <p className="resource-desc">{res.description}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          id="teaching"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'teaching' ? 'is-active' : ''} ${revealedSteps.has('teaching') ? 'is-revealed' : ''}`}
        >
          <div className="section-page">
            <h2>Teaching</h2>
            <FormattedText text={resolvedSiteContent.teaching_lead} className="section-lead" />

            <div className="goal-grid">
              {resolvedSiteContent.teaching_items.map((item, index) => (
                <article className="feature-item" key={`${item.title}-${index}`}>
                  <h3>{item.title}</h3>
                  <FormattedText text={item.description} />
                </article>
              ))}
            </div>

            {resolvedSiteContent.dissertation_items.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <h3 className="subsection-title">Dissertations</h3>
                <div className="paper-grid reveal-grid" style={{ marginTop: 16 }}>
                  {resolvedSiteContent.dissertation_items.map((diss) => {
                    const meta = [diss.type.toUpperCase(), diss.year].filter(Boolean).join(' · ');
                    if (diss.link) {
                      return (
                        <a
                          key={diss.id}
                          href={diss.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="paper-item paper-trigger"
                        >
                          <h3>{diss.title}</h3>
                          {diss.student && <p>{diss.student}</p>}
                          {meta && <p className="project-years">{meta}</p>}
                        </a>
                      );
                    }
                    return (
                      <article key={diss.id} className="paper-item">
                        <h3>{diss.title}</h3>
                        {diss.student && <p>{diss.student}</p>}
                        {meta && <p className="project-years">{meta}</p>}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          id="contact"
          data-tree-section
          className={`tree-section section-light ${activeStep === 'contact' ? 'is-active' : ''} ${revealedSteps.has('contact') ? 'is-revealed' : ''}`}
        >
          <div className="section-page">
            <h2>Contact</h2>
            <FormattedText text={resolvedSiteContent.contact_lead} className="section-lead" />

            <div className="contact-grid">
              <article className="feature-item">
                <Mail className="h-5 w-5" />
                <h3>Email</h3>
                <p>{resolvedSiteContent.contact_email}</p>
              </article>
              <article className="feature-item">
                <Phone className="h-5 w-5" />
                <h3>Phone</h3>
                <p>{resolvedSiteContent.contact_phone}</p>
              </article>
              <article className="feature-item">
                <MapPin className="h-5 w-5" />
                <h3>Location</h3>
                <p>{resolvedSiteContent.contact_location}</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      {selectedMember && (
        <div
          className="member-modal-overlay"
          onClick={() => setSelectedMember(null)}
          role="presentation"
        >
          <div className="member-modal" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => setSelectedMember(null)}
              className="close-button"
              aria-label="Close member details"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="section-kicker">Member Profile</p>
            <h2>{selectedMember.name}</h2>
            {memberPhoto(selectedMember) && (
              <img
                src={memberPhoto(selectedMember) ?? ''}
                alt={selectedMember.name}
                className="member-modal-photo"
                loading="lazy"
              />
            )}
            <p className="member-role">{selectedMember.role}</p>
            <p>{selectedMember.description}</p>
            {selectedMember.cv_link && (
              <a
                href={selectedMember.cv_link}
                target="_blank"
                rel="noopener noreferrer"
                className="paper-link"
              >
                View CV <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {selectedProject && (
        <div
          className="member-modal-overlay project-modal-overlay"
          onClick={() => setSelectedProject(null)}
          role="presentation"
        >
          <div className="member-modal project-modal" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => setSelectedProject(null)}
              className="close-button"
              aria-label="Close project details"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="section-kicker">Project Details</p>
            <h2>{selectedProject.title}</h2>
            <p className="project-years">
              {selectedProject.start_year
                ? `${selectedProject.start_year} - ${selectedProject.end_year || 'Present'}`
                : 'Ongoing'}
            </p>
            <p>{selectedProject.description}</p>
            {selectedProject.links && selectedProject.links.length > 0 && (
              <div className="project-links">
                {selectedProject.links.map((link) => (
                  <a
                    key={`${selectedProject.id}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    {link.label} <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
