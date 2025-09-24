import React from "react";
import { 
  FileText, 
  Search, 
  Download, 
  Plus, 
  Clock, 
  Star,
  Filter,
  Grid,
  List,
  BookOpen
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const Papers: React.FC = () => {
  const mockPapers = [
    {
      id: 1,
      title: "Attention Is All You Need",
      authors: "Vaswani et al.",
      arxivId: "arXiv:1706.03762",
      publishedDate: "2017-06-12",
      abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
      category: "Machine Learning",
      downloadUrl: "#",
      favorite: true
    },
    {
      id: 2,
      title: "BERT: Pre-training of Deep Bidirectional Transformers",
      authors: "Devlin et al.",
      arxivId: "arXiv:1810.04805",
      publishedDate: "2018-10-11",
      abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder...",
      category: "Natural Language Processing",
      downloadUrl: "#",
      favorite: false
    },
    {
      id: 3,
      title: "Language Models are Few-Shot Learners",
      authors: "Brown et al.",
      arxivId: "arXiv:2005.14165",
      publishedDate: "2020-05-28",
      abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training...",
      category: "Natural Language Processing",
      downloadUrl: "#",
      favorite: true
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Research Papers</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Discover, organize, and manage your academic research papers from arXiv and other sources
        </p>
      </div>

      {/* Search and Controls */}
      <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search papers by title, author, or arXiv ID..."
              className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" className="glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20">
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20">
              <List className="w-4 h-4" />
            </Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Paper
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Papers", value: "3", icon: FileText, color: "blue" },
          { label: "Downloaded", value: "2", icon: Download, color: "green" },
          { label: "Favorites", value: "2", icon: Star, color: "yellow" },
          { label: "Recent", value: "1", icon: Clock, color: "purple" }
        ].map((stat, index) => (
          <div key={index} className="glass rounded-xl p-4 border border-white/20 backdrop-blur-xl text-center">
            <div className={`w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center bg-gradient-to-br ${
              stat.color === 'blue' ? 'from-blue-500 to-blue-600' :
              stat.color === 'green' ? 'from-green-500 to-green-600' :
              stat.color === 'yellow' ? 'from-yellow-500 to-yellow-600' :
              'from-purple-500 to-purple-600'
            }`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockPapers.map((paper) => (
          <div key={paper.id} className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl hover:scale-[1.02] transition-transform duration-300 group">
            {/* Paper Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    {paper.category}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className={`${paper.favorite ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
              >
                <Star className={`w-4 h-4 ${paper.favorite ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Paper Content */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 transition-colors duration-300">
                {paper.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Authors:</strong> {paper.authors}
              </p>
              
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>arXiv ID:</strong> {paper.arxivId}
              </p>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                {paper.abstract}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(paper.publishedDate).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Read
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">More Features Coming Soon</h3>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          We're working on integrating with arXiv API, automatic paper recommendations, and advanced categorization features.
        </p>
      </div>
    </div>
  );
};

export { Papers }; 