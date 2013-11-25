/* iOS orientation change bug fix */
if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
   var viewportmeta = document.querySelector('meta[name="viewport"]');
   if (viewportmeta) {
      viewportmeta.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0';
      document.body.addEventListener('gesturestart', function() {
         viewportmeta.content = 'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
      }, false);
   }
}

/**
 * Unspamify: Convert "spam-concious" links to mailto: links. This plugin
 * reads the .html() of an anchor element and adds a "href" attribute that is
 * a mailto link.
 *
 * Formats supported:
 *  - <a>display text here: email at domain dot com</a>
 *  - <a>email at domain dot com</a>
 *
 * Author: Andrew Dunkman
 * License: MIT
 */
(function ($) {
   var trim = function (input) { return input.replace(/^\s+|\s+$/g, ""); };

   $.fn.unspamify = function () {
      return this.each(function () {
         var $this = $(this),
             text = $this.text(),
             parts, email, label;

         if (text.indexOf(':') > 0) {
            parts = text.split(':');
            label = parts[0];
            text = parts[1];
         }

         parts = text.split(' at ');
         email = parts[0] + '@' + parts[1].replace(/ dot /g, '.');
         label = label || email;

         $this.attr('href', 'mailto:' + trim(email));
         $this.text(trim(label));
      });
   };
})(jQuery);

$(document).ready(function () {
   $('a.email-text').unspamify();
   // $('.tweets').tweet({
   //    avatar_size: 48,
   //    count: 5,
   //    fetch: 20,
   //    filter: function(t){ return ! /^@\w+/.test(t['tweet_raw_text']); },
   //    username: 'blakevanlan',
   //    template: '{avatar}{text}{time}',
   //    loading_text: 'Loading&hellip;'
   // });
   // Replace images with 2x versions for toolbox
   if ((window.devicePixelRatio || 1) > 1) {
      $('.toolbox .tool img').each(function (index) {
         $el = $(this)
         src = $el.attr('src');
         $el.attr('src', src.replace('.jpg', '@2x.jpg'));
      });
   }

   // Github repos for sidebar on blog
   $github = $('.github').first();
   if ($github) {
      $github.html('Loading...')
      $.getJSON('https://api.github.com/users/blakevanlan/repos?callback=?', function (data) {
         if (!data || !data.data) {
            $github.html('Failed to load repos');
            return;
         }
         var repos = data.data;
         
         // Turn string into date
         for (var i = repos.length - 1; i >= 0; i--) {
            repos[i].pushed_at_date = new Date(repos[i].pushed_at);
         };
         // Sort repos in descending order
         repos.sort(function (a, b) {
            return b.pushed_at_date - a.pushed_at_date;
         });

         var $list = $('<ul class="repos"></ul>');
         var repoTemplate = '<li class="repo"><a href="{url}>{name}</a></li>';
         for (var i = 0, len = repos.length > 5 ? 5 : repos.length; i < len; i++) {
            // if (repos[i].fork) continue;
            console.log(repos[i].updated_at_date);
            var li = $('<li class="repo"></li>');
            var link = $('<a href="' + repos[i].html_url +'">' + repos[i].name + '</a>');
            if (repos[i].fork) $('<span class="fork">(fork)</span>').appendTo(link);
            link.appendTo(li);
            $('<span class="desc">' + repos[i].description + '</span>').appendTo(li);
            li.appendTo($list);
         };
         $github.empty().append($list);
         console.log('REPOS', repos);  
      });
   }
});
