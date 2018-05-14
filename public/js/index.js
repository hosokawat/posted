$(function () {
    var file_code = location.pathname.split('/')[1];

    function generateLibList() {
        $dropdownMenu = $('<div class="dropdown-menu" role="menu"></div>');
        var firstSkip = true;
        _.forEach(libs, function (value, key) {
            if (!firstSkip) {
                $dropdownMenu.append('<div class="dropdown-divider"></div>');
            }
            firstSkip = false;
            $dropdownMenu.append($(`<h5 class="dropdown-header">${key}</h5>`));
            _.forEach(value, function (v) {
                $dropdownMenu.append($(`<a class="dropdown-item addLibListSelect" href="#" data-url='${v['url']}'>${v['name']}</a>`));
            });
        });

        $('#addLibList .dropdown-menu').html($dropdownMenu.html())

    }
    $('#addLibList  .dropdown-toggle').click(function () {
        $('#addLibList .dropdown-menu').toggleClass('show');
        return false;
    })

    $.getJSON("libs.json", function (data) {
        libs = _.chain(data).orderBy('order').groupBy('category').value();;
        generateLibList();
    });
    function reloadPreview() {
        $('#preview iframe').replaceWith($('#preview iframe').clone())
    }
    $('#toggleContent .nav-link').click(function () {
        $(this).toggleClass('active');
        var ext = $(this).data('ext');
        var $content = $("#content").find(`[data-ext="${ext}"]`);
        if ($(this).hasClass('active')) {
            $content.show();
        } else {
            $content.hide();
        }
    });
    $(document).on('keyup keypress', '#content  .CodeMirror textarea', function () {
        var ext = $(this).closest('div.col').data('ext');
        var data = editors[ext].getValue();

        $.ajax({
            url: `${file_code}.${ext}`,
            type: 'post',
            dataType: 'json',
            data: { data: data },
            dataType: 'text'
        }).done(function (data) {
            reloadPreview();
        });
    });

    function updateLibUrl(url, remove) {
        $.ajax({
            url: `/${file_code}.libs`,
            type: 'post',
            dataType: 'json',
            data: { data: url, remove: remove },
            dataType: 'text'
        }).done(function (data) {
            generateActiveLibList(data.split(','));
            reloadPreview();
        });
    }

    function loadLibUrl() {
        $.ajax({
            url: `/${file_code}.libs`,
            type: 'get',
            dataType: 'json',
            data: {},
            dataType: 'text'
        }).done(function (data) {
            generateActiveLibList(data.split(','));
        });
    }

    loadLibUrl();
    $('#addLibUrlSubmit').click(function (e) {
        e.preventDefault();
        var url = $('#addLibUrl').val();
        updateLibUrl(url, false);
        $('#addLibUrl').val('');

        $('#addLibDropdownMenu').removeClass('show');
        return false;
    });

    $(document).on('click', '.addLibListSelect', function (e) {
        e.preventDefault();
        var url = $(this).data('url');
        updateLibUrl(url, false);
        $('#addLibDropdownMenu').removeClass('show');
        $('#addLibList .show').removeClass('show');

        return false;
    });

    $(document).on('click', ' .remove-lib', function (e) {
        e.preventDefault();
        var url = $(this).data('url');
        updateLibUrl(url, true);
        $('#addLibDropdownMenu').removeClass('show');
        return false;
    });

    function generateActiveLibList(urls) {
        o = urls;
        $('#addLibDropdownMenu .remove-lib').remove();
        _.forEach(urls, function (url) {

            var name;
            var lib = _.chain(libs).flatMapDepth().filter({ url: url }).head().value();
            if (lib) {
                name = lib['name'];
            } else {
                name = url.match(/\/([^\/]+)$/).pop();
            }
            $('#addLibDropdownMenu').append($(`<a class="dropdown-item remove-lib" role="presentation" data-url="${url}" href="#"><i class="fa fa-close"></i> ${name}</a>`));
        });
    }

    function updateHistoryList() {
        $('#historyList').html('');
        $.getJSON(`${file_code}/history`, function (data) {
            _.forEach(data, function (d) {
                var id = d['id'];
                var $item;
                if (d['id'] == file_code) {
                    $item = $(`<span class="dropdown-item-text text-white bg-primary" role="presentation">${d['id']}</span>`);

                } else {
                    $item = $(`<a class="dropdown-item" role="presentation" href="/${d['id']}">${d['id']}</a>`);
                }

                $('#historyList').append($item)
            });
        });



    }

    updateHistoryList();

    $('#share').click(function () {
        $('#shareLink').text(location.href);
    });

    $('#addLibDropdown > .dropdown-toggle').click(function () {
        $('#addLibList .show').removeClass('show');
    });

    editors = {};
    $('#content textarea').each(function () {
        var txt = $(this).get()[0];
        var m = $(this).data('mode');
        var editor = CodeMirror.fromTextArea(txt, {
            lineNumbers: false,
            lineWrapping: true,
            mode: m
        });
        editor.setSize("100%", "100%");
        editors[$(this).data('ext')] = editor;
        $(this).remove();
    });
});