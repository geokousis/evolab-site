import { useEffect, useState } from 'react';
import { supabase, Member, Project, Publication } from './lib/supabase';
import { ExternalLink, X, ChevronDown } from 'lucide-react';

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [projectFilter, setProjectFilter] = useState<'active' | 'past'>('active');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [membersRes, projectsRes, publicationsRes] = await Promise.all([
      supabase.from('members').select('*').order('display_order'),
      supabase.from('projects').select('*').order('display_order'),
      supabase.from('publications').select('*').order('year', { ascending: false }),
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (publicationsRes.data) setPublications(publicationsRes.data);
  };

  const currentMembers = members.filter(m => m.is_current);
  const pastMembers = members.filter(m => !m.is_current);
  const filteredProjects = projects.filter(p => p.status === projectFilter);

  return (
    <div className="min-h-screen bg-white font-serif">
      <nav className="fixed top-0 w-full bg-white border-b border-gray-300 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 border-2 border-gray-900 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900 font-sans">E</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 tracking-tight font-sans">EvoLab</div>
                <div className="text-xs text-gray-600 font-sans">Population Genetics</div>
              </div>
            </div>
            <div className="hidden md:flex space-x-12">
              <a href="#about" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-sans tracking-wide">ABOUT</a>
              <a href="#projects" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-sans tracking-wide">PROJECTS</a>
              <a href="#publications" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-sans tracking-wide">PUBLICATIONS</a>
              <a href="#members" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-sans tracking-wide">TEAM</a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-40 pb-32 px-4 sm:px-6 lg:px-8 border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            <div>
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-2">RESEARCH LABORATORY</p>
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 leading-tight">
                EvoLab
              </h1>
              <div className="w-24 h-1 bg-gray-900 mt-8 mb-8"></div>
            </div>
            <p className="text-xl text-gray-700 max-w-3xl leading-relaxed">
              A leading research laboratory dedicated to understanding the evolutionary processes that shape genetic diversity in populations through theoretical models, empirical data, and cutting-edge genomic technologies.
            </p>
            <div className="pt-4">
              <a href="#about" className="inline-flex items-center space-x-3 text-gray-900 hover:text-gray-600 transition-colors font-sans text-sm font-semibold">
                <span>LEARN MORE</span>
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-16">
            <div>
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-4">ABOUT US</p>
              <h2 className="text-5xl font-bold text-gray-900 mb-8">Our Mission & Vision</h2>
              <div className="w-16 h-1 bg-gray-900"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-sans">Research Excellence</h3>
                <p className="text-gray-700 leading-relaxed">
                  We conduct pioneering studies in evolutionary dynamics, combining theoretical population genetics with empirical genomic data.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-sans">Collaborative Science</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our interdisciplinary team brings expertise in evolutionary biology, statistics, bioinformatics, and molecular genetics.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-sans">Innovation & Discovery</h3>
                <p className="text-gray-700 leading-relaxed">
                  We develop cutting-edge computational methods and employ advanced genomic technologies to understand genetic diversity.
                </p>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-gray-300">
              <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
                We analyze genetic variation across diverse organisms to uncover the mechanisms driving adaptation and speciation. Our work bridges theory and empirical research, addressing fundamental questions in population genetics with both academic rigor and practical application.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-12">
            <div>
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-4">CURRENT RESEARCH</p>
              <h2 className="text-5xl font-bold text-gray-900 mb-8">Research Projects</h2>
              <div className="w-16 h-1 bg-gray-900"></div>
            </div>

            <div className="flex space-x-6 border-b border-gray-300">
              <button
                onClick={() => setProjectFilter('active')}
                className={`py-3 px-1 text-sm font-sans font-semibold tracking-wide transition-colors border-b-2 ${
                  projectFilter === 'active'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ACTIVE
              </button>
              <button
                onClick={() => setProjectFilter('past')}
                className={`py-3 px-1 text-sm font-sans font-semibold tracking-wide transition-colors border-b-2 ${
                  projectFilter === 'past'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                COMPLETED
              </button>
            </div>

            <div className="space-y-8">
              {filteredProjects.map((project, index) => (
                <div key={project.id} className="border-l-2 border-gray-300 pl-6 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                    {project.start_year && (
                      <span className="text-sm font-sans text-gray-500 whitespace-nowrap ml-8">
                        {project.start_year}–{project.end_year || 'Present'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{project.description}</p>
                </div>
              ))}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 font-sans">No {projectFilter} projects available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="publications" className="py-20 px-4 sm:px-6 lg:px-8 border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-12">
            <div>
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-4">SCHOLARLY WORK</p>
              <h2 className="text-5xl font-bold text-gray-900 mb-8">Publications</h2>
              <div className="w-16 h-1 bg-gray-900"></div>
            </div>

            <div className="space-y-6">
              {publications.map((pub) => (
                <div key={pub.id} className="group border-l-2 border-gray-300 pl-6 py-2 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-700">{pub.title}</h3>
                      <p className="text-gray-600 text-sm mb-2 font-sans">{pub.authors}</p>
                      <p className="text-gray-600 text-sm">
                        <span className="italic">{pub.journal}</span>
                        {' '}
                        <span className="font-sans text-xs">{pub.year}</span>
                        {pub.doi && <span className="font-sans text-xs ml-3">DOI: {pub.doi}</span>}
                      </p>
                    </div>
                    {pub.link && (
                      <a
                        href={pub.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-gray-600 hover:text-gray-900 transition-colors mt-1"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {publications.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 font-sans">Publications coming soon</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="members" className="py-20 px-4 sm:px-6 lg:px-8 border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto">
          <div>
            <div className="mb-12">
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-4">RESEARCH TEAM</p>
              <h2 className="text-5xl font-bold text-gray-900 mb-8">Our Team</h2>
              <div className="w-16 h-1 bg-gray-900"></div>
            </div>

            <div className="mb-20">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 font-sans">Current Members</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {currentMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="text-left group border-l-2 border-gray-300 pl-6 py-2 hover:border-gray-600 transition-colors"
                  >
                    <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-700">{member.name}</h4>
                    <p className="text-gray-600 font-sans text-sm mb-3">{member.role}</p>
                    <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors line-clamp-2">{member.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {pastMembers.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-8 font-sans opacity-75">Past Members</h3>
                <div className="grid md:grid-cols-2 gap-8 opacity-60">
                  {pastMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="text-left group border-l-2 border-gray-300 pl-6 py-2 hover:border-gray-600 transition-colors"
                    >
                      <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-700">{member.name}</h4>
                      <p className="text-gray-600 font-sans text-sm mb-3">{member.role}</p>
                      <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors line-clamp-2">{member.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 font-sans">Team information coming soon</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 border-2 border-white flex items-center justify-center">
                  <span className="text-sm font-bold text-white font-sans">E</span>
                </div>
                <div>
                  <div className="text-lg font-bold tracking-tight font-sans">EvoLab</div>
                  <div className="text-xs text-gray-400 font-sans">Population Genetics</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mt-6">
                Advancing our understanding of evolutionary processes through rigorous research and collaborative science.
              </p>
            </div>
            <div className="text-sm text-gray-400 space-y-2 font-sans">
              <p>Research Laboratory</p>
              <p>Evolutionary Biology</p>
              <p>Population Genetics</p>
              <p>Genomic Analysis</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-500 text-sm text-center font-sans">
              Copyright © {new Date().getFullYear()} EvoLab. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedMember(null)}>
          <div className="bg-white max-w-3xl w-full p-10 relative font-serif" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-6 right-6 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-8">
              <p className="text-sm font-sans text-gray-600 tracking-widest mb-3 uppercase">Team Member</p>
              <h3 className="text-4xl font-bold text-gray-900 mb-2">{selectedMember.name}</h3>
              <div className="w-12 h-1 bg-gray-900 mb-6"></div>
              <p className="text-lg font-sans text-gray-700 font-semibold">{selectedMember.role}</p>
            </div>

            <div className="mb-8 pb-8 border-b-2 border-gray-300">
              <p className="text-gray-700 leading-relaxed text-lg">
                {selectedMember.description}
              </p>
            </div>

            {selectedMember.cv_link && (
              <div className="pt-4">
                <a
                  href={selectedMember.cv_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-3 text-gray-900 hover:text-gray-600 transition-colors font-sans text-sm font-semibold"
                >
                  <span>VIEW FULL CV</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
