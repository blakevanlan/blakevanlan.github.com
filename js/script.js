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

         if (text.indexOf(":") > 0) {
            parts = text.split(":");
            label = parts[0];
            text = parts[1];
         }

         parts = text.split(" at ");
         email = parts[0] + "@" + parts[1].replace(/ dot /g, ".");
         label = label || email;

         $this.attr("href", "mailto:" + trim(email));
         $this.text(trim(label));
      });
   };
})(jQuery);

$(document).ready(function () {
   $("a.email-text").unspamify();
   $(".tweets").tweet({
      avatar_size: 48,
      count: 5,
      fetch: 20,
      filter: function(t){ return ! /^@\w+/.test(t["tweet_raw_text"]); },
      username: "blakevanlan",
      template: "{avatar}{text}{time}",
      loading_text: "Loading&hellip;"
   });
});