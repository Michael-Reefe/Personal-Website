(function() {

    var quotes = $(".quotes");
    var quoteIndex = -1;
    
    function showNextQuote() {
        ++quoteIndex;
        quotes.eq(quoteIndex % quotes.length)
            .animate({opacity: "show"}, 2000)
            .delay(5000)
            .animate({opacity: "hide"}, 2000, showNextQuote);
            // .fadeIn(2000)
            // .delay(5000)
            // .fadeOut(2000, showNextQuote);
    }
    
    showNextQuote();
    
})();