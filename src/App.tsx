import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase, Member, Project, Publication } from './lib/supabase';
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
  { id: 'members', label: 'Members' },
  { id: 'projects', label: 'Projects' },
  { id: 'papers', label: 'Papers' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'contact', label: 'Contact' },
];

const treeNodes: { id: StepId; short: string; x: number; y: number; activeAt: number }[] = [
  { id: 'our-goal', short: 'GOAL', x: 540, y: 260, activeAt: 0 },
  { id: 'members', short: 'MEMBERS', x: 740, y: 430, activeAt: 1 },
  { id: 'projects', short: 'PROJECTS', x: 930, y: 610, activeAt: 2 },
  { id: 'papers', short: 'PAPERS', x: 1140, y: 712, activeAt: 3 },
  { id: 'teaching', short: 'TEACHING', x: 1216, y: 742, activeAt: 4 },
  { id: 'contact', short: 'CONTACT', x: 1268, y: 860, activeAt: 5 },
];

const treeBranches = [
  { x1: 430, y1: 700, x2: 540, y2: 260, activeAt: 0 },
  { x1: 430, y1: 700, x2: 620, y2: 570, activeAt: 1 },
  { x1: 620, y1: 570, x2: 740, y2: 430, activeAt: 1 },
  { x1: 620, y1: 570, x2: 820, y2: 650, activeAt: 2 },
  { x1: 820, y1: 650, x2: 930, y2: 610, activeAt: 2 },
  { x1: 820, y1: 650, x2: 1040, y2: 772, activeAt: 3 },
  { x1: 1040, y1: 772, x2: 1140, y2: 712, activeAt: 3 },
  { x1: 1040, y1: 772, x2: 1138, y2: 812, activeAt: 4 },
  { x1: 1138, y1: 812, x2: 1216, y2: 742, activeAt: 4 },
  { x1: 1138, y1: 812, x2: 1268, y2: 860, activeAt: 5 },
] as const;

const mobileTreeNodes: { id: StepId; short: string; x: number; y: number; activeAt: number }[] = [
  { id: 'our-goal', short: 'GOAL', x: 62, y: 22, activeAt: 0 },
  { id: 'members', short: 'MEM', x: 132, y: 34, activeAt: 1 },
  { id: 'projects', short: 'PROJ', x: 224, y: 58, activeAt: 2 },
  { id: 'papers', short: 'PAP', x: 286, y: 72, activeAt: 3 },
  { id: 'teaching', short: 'TEACH', x: 352, y: 56, activeAt: 4 },
  { id: 'contact', short: 'CONT', x: 376, y: 96, activeAt: 5 },
];

const mobileTreeBranches = [
  { x1: 20, y1: 95, x2: 62, y2: 22, activeAt: 0 },
  { x1: 20, y1: 95, x2: 90, y2: 70, activeAt: 1 },
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

type EvoGridPoint = readonly [number, number];

const EVO_GRID_COLS = 28;
const EVO_GRID_ROWS = 9;
const EVO_CELL = 18;
const EVO_OFFSET_X = 18;
const EVO_OFFSET_Y = 16;
const EVO_WIDTH = EVO_OFFSET_X * 2 + (EVO_GRID_COLS - 1) * EVO_CELL;
const EVO_HEIGHT = EVO_OFFSET_Y * 2 + (EVO_GRID_ROWS - 1) * EVO_CELL;

const evoChains: EvoGridPoint[][] = [
  // E
  [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]],
  [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]],
  [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  // V
  [[10, 1], [11, 3], [12, 5], [13, 7]],
  [[16, 1], [15, 3], [14, 5], [13, 7]],
  // O
  [[20, 1], [22, 1], [24, 1], [25, 2], [26, 3], [26, 5], [25, 6], [24, 7], [22, 7], [20, 7], [19, 6], [18, 5], [18, 3], [19, 2], [20, 1]],
];

const evoSegments = evoChains.flatMap((chain) =>
  chain.slice(1).map((to, index) => ({ from: chain[index], to }))
);

const evoWordPoints = Array.from(
  new Map(
    evoSegments
      .flatMap((segment) => [segment.from, segment.to])
      .map((point) => [`${point[0]}-${point[1]}`, point] as const)
  ).values()
);

const evoGridDots = Array.from({ length: EVO_GRID_ROWS }, (_, y) =>
  Array.from({ length: EVO_GRID_COLS }, (_, x) => [x, y] as EvoGridPoint)
).flat();

const evoPoint = (point: EvoGridPoint) => ({
  x: EVO_OFFSET_X + point[0] * EVO_CELL,
  y: EVO_OFFSET_Y + point[1] * EVO_CELL,
});

const withDelay = (delayMs: number) => ({ '--delay': `${delayMs}ms` } as CSSProperties);

function App() {
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [projects, setProjects] = useState<DisplayProject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [scholarMetrics, setScholarMetrics] = useState<ScholarMetrics | null>(null);
  const [scholarPublications, setScholarPublications] = useState<DisplayPublication[]>([]);
  const [selectedMember, setSelectedMember] = useState<DisplayMember | null>(null);
  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [projectFilter, setProjectFilter] = useState<'active' | 'past'>('past');
  const [activeStep, setActiveStep] = useState<StepId>('our-goal');

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
    const [membersRes, projectsRes, publicationsRes, scholarRes] = await Promise.all([
      supabase.from<Member>('members').select('*').order('display_order'),
      supabase.from<Project>('projects').select('*').order('display_order'),
      supabase.from<Publication>('publications').select('*').order('year', { ascending: false }),
      fetch('/data/scholar-cache.json', { cache: 'no-store' }).catch(() => null),
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data as DisplayProject[]);
    if (publicationsRes.data) setPublications(publicationsRes.data);

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
  const visibleMembers = (currentMembers.length > 0 ? currentMembers : demoMembers).slice(0, 6);
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
      : activeProjects;

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
    return member.photo_url || member.image_url || member.avatar_url || null;
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
          className={`tree-section section-dark ${activeStep === 'our-goal' ? 'is-active' : ''}`}
        >
          <div className="section-page goal-page">
            <div className="goal-lab-hero">
              <p className="lab-name" aria-label="EvoLab">
                <svg
                  className="evo-network"
                  viewBox={`0 0 ${EVO_WIDTH} ${EVO_HEIGHT}`}
                  role="img"
                  aria-hidden="true"
                >
                  {evoGridDots.map((point) => {
                    const pos = evoPoint(point);
                    return (
                      <circle
                        key={`grid-${point[0]}-${point[1]}`}
                        cx={pos.x}
                        cy={pos.y}
                        r="1.7"
                        className="net-grid-dot"
                      />
                    );
                  })}

                  {evoSegments.map((segment, index) => {
                    const from = evoPoint(segment.from);
                    const to = evoPoint(segment.to);
                    return (
                      <line
                        key={`link-${segment.from[0]}-${segment.from[1]}-${segment.to[0]}-${segment.to[1]}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        pathLength={1}
                        className="net-link"
                        style={withDelay(index * 46)}
                      />
                    );
                  })}

                  {evoWordPoints.map((point, index) => {
                    const pos = evoPoint(point);
                    return (
                      <circle
                        key={`word-${point[0]}-${point[1]}`}
                        cx={pos.x}
                        cy={pos.y}
                        r="2.35"
                        className="net-word-dot"
                        style={withDelay(100 + index * 22)}
                      />
                    );
                  })}
                </svg>
                <span className="lab-name-lab">Lab</span>
              </p>
            </div>

            <div className="goal-copy">
              <h2>Our Goal</h2>
              <p className="section-lead">
                Welcome to EvoLab at FORTH-ICS. Our mission is to understand the evolutionary
                forces that shape variability in populations. We focus on algorithm
                implementation and data analysis to understand how processes such as genetic
                drift and natural selection affect the phenotype and genotype.
              </p>
              <p className="section-lead">
                We work on a diverse array of organisms, from A. thaliana to H. sapiens. Our
                home is the Institute of Computer Science in Foundation for Research and
                Technology - Hellas (FORTH-ICS).
              </p>
            </div>

            <div className="goal-grid">
              <article className="feature-item">
                <h3>Nothing in Biology Makes Sense Except in the Light of Evolution</h3>
                <p>Theodosius Dobzhansky</p>
              </article>
              <article className="feature-item">
                <h3>Nothing in Evolution Makes Sense Except in Light of Population Genetics</h3>
                <p>Mike Lynch</p>
              </article>
              <article className="feature-item">
                <h3>Nothing in Population Genetics Makes Sense...</h3>
                <p>EvoLab</p>
              </article>
            </div>
          </div>
        </section>

        <section
          id="members"
          data-tree-section
          className={`tree-section section-light ${activeStep === 'members' ? 'is-active' : ''}`}
        >
          <div className="section-page">
            <h2>Members</h2>
            <p className="section-lead">
              A collaborative team across evolutionary biology, genomics, and quantitative analysis.
            </p>

            <div className="member-grid reveal-grid">
              {visibleMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="member-item"
                >
                  <div className="member-head">
                    <span className="member-avatar" aria-hidden="true">
                      {memberPhoto(member) ? (
                        <img
                          src={memberPhoto(member) ?? ''}
                          alt=""
                          className="member-avatar-image"
                          loading="lazy"
                        />
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

            {pastMembers.length > 0 && (
              <p className="past-note">{pastMembers.length} past members are part of this lineage.</p>
            )}
          </div>
        </section>

        <section
          id="projects"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'projects' ? 'is-active' : ''}`}
        >
          <div className="section-page">
            <h2>Projects</h2>

            <div className="filter-row" role="tablist" aria-label="Project status filter">
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
            </div>

            {filteredProjects.length > 0 ? (
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
              <p className="empty-message">No {projectFilter.toLowerCase()} projects available yet.</p>
            )}
          </div>
        </section>

        <section
          id="papers"
          data-tree-section
          className={`tree-section section-light ${activeStep === 'papers' ? 'is-active' : ''}`}
        >
          <div className="section-page">
            <h2>Papers</h2>

            {scholarMetrics && (
              <p className="section-lead">
                Citations: {scholarMetrics.totalCitations ?? '-'} · h-index: {scholarMetrics.hIndex ?? '-'} · i10-index: {scholarMetrics.i10Index ?? '-'}
              </p>
            )}

            {latestClickablePublications.length > 0 ? (
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
            )}
          </div>
        </section>

        <section
          id="teaching"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'teaching' ? 'is-active' : ''}`}
        >
          <div className="section-page">
            <h2>Teaching</h2>
            <p className="section-lead">
              Training the next generation through courses, mentoring, and open practical workshops.
            </p>

            <div className="goal-grid">
              <article className="feature-item">
                <h3>Graduate Modules</h3>
                <p>Population genomics, evolutionary modeling, and reproducible quantitative workflows.</p>
              </article>
              <article className="feature-item">
                <h3>Hands-On Training</h3>
                <p>Live coding sessions for analysis pipelines, statistical validation, and interpretation.</p>
              </article>
              <article className="feature-item">
                <h3>Mentorship</h3>
                <p>Research supervision and project design support for students across career stages.</p>
              </article>
            </div>
          </div>
        </section>

        <section
          id="contact"
          data-tree-section
          className={`tree-section section-dark ${activeStep === 'contact' ? 'is-active' : ''}`}
        >
          <div className="section-page">
            <h2>Contact</h2>
            <p className="section-lead">
              Reach out for collaboration, student opportunities, or invited talks.
            </p>

            <div className="contact-grid">
              <article className="feature-item">
                <Mail className="h-5 w-5" />
                <h3>Email</h3>
                <p>contact@evolab.org</p>
              </article>
              <article className="feature-item">
                <Phone className="h-5 w-5" />
                <h3>Phone</h3>
                <p>+1 (000) 000-0000</p>
              </article>
              <article className="feature-item">
                <MapPin className="h-5 w-5" />
                <h3>Location</h3>
                <p>Department of Evolutionary Biology, University Campus</p>
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
