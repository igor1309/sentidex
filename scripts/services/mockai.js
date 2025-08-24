function getMockEnrichment(content) {
    console.log('Using mock AI provider');
    
    // Simple deterministic responses based on content length
    const words = content.split(' ').length;
    const contentPreview = content.substring(0, 50).toLowerCase();
    
    return {
      summary: `Mock summary for ${words} words of content`,
      tags: ['mock', 'test', contentPreview.includes('telegram') ? 'telegram' : 'message'],
      title: `mock-content-${Date.now().toString(36)}`
    };
  }
  
  module.exports = {
    getMockEnrichment
  };