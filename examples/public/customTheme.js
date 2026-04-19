(function () {
    if (!navigator.clipboard) {
        var textarea = document.createElement("textarea");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        navigator.clipboard = {
            writeText: function (text) {
                textarea.value = text;
                textarea.select();
                document.execCommand("copy");
            },
        };
    }
    function applyFixes() {
        var favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            favicon.type = "image/svg+xml";
            document.head.appendChild(favicon);
        }
        favicon.href = "https://cdn.ujjwalvivek.com/icons/logo-tinyts.webp";
        favicon.type = "image/svg+xml";
        var footer = document.querySelector("footer > p");
        if (footer) {
            footer.innerHTML =
                'TinyTS <a href="https://github.com/ujjwalvivek/tinyts" target="_blank">Source</a>';
        }
        var links = document.querySelectorAll("a.tsd-index-link");
        for (var i = 0; i < links.length; i++) {
            links[i].style.setProperty("padding", "6px 10px", "important");
        }
    }
    if (window.app) {
        applyFixes();
    } else {
        var check = setInterval(function () {
            if (window.app) {
                clearInterval(check);
                applyFixes();
                setTimeout(applyFixes, 600);
            }
        }, 50);
    }
})();
