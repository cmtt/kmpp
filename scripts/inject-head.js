'use strict';
// Adds title, description, social metadata and a favicon to the built page.
var fs = require('fs');
var path = require('path');

var file = path.join(__dirname, '..', 'docs', 'index.html');
var html = fs.readFileSync(file, 'utf8');

var url = 'https://cmtt.github.io/kmpp/';
var title = 'kmpp: k-means++ and e-means in JavaScript';
var description = 'Interactive demo of kmpp (k-means with k-means++ initialization) and e-means, a mini-batch k-means variant that reaches similar loss in a few epochs.';
var favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#222"/>' +
  '<circle cx="10" cy="11" r="5" fill="#e0457b"/><circle cx="22" cy="12" r="5" fill="#3ab795"/><circle cx="16" cy="23" r="5" fill="#4f6bed"/></svg>'
);

var tags = [
  '<title>' + title + '</title>',
  '<meta name="description" content="' + description + '">',
  '<link rel="canonical" href="' + url + '">',
  '<link rel="icon" href="' + favicon + '">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="' + title + '">',
  '<meta property="og:description" content="' + description + '">',
  '<meta property="og:url" content="' + url + '">',
  '<meta name="twitter:card" content="summary">',
  '<meta name="twitter:title" content="' + title + '">',
  '<meta name="twitter:description" content="' + description + '">'
].join('');

// Allow pinch zoom (the generated viewport tag disables it):
html = html.replace(/<meta content="width=device-width[^>]*name="viewport"\s*\/?>/i, '<meta name="viewport" content="width=device-width, initial-scale=1">');
html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
if (!/<head[^>]*>/i.test(html)) throw new Error('no <head> in built page');
html = html.replace(/<head[^>]*>/i, function (m) { return m + tags; });
if (!/<html[^>]*\blang=/i.test(html)) html = html.replace(/<html/i, '<html lang="en"');
fs.writeFileSync(file, html);
