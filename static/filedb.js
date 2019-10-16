"use strict";

var persons = null;
var locations = null;
var tags = null;

var categorize_files = null;
var categorize_index = -1;

var slideshow_files = null;
var slideshow_index = -1;
var slideshow_timer = null;
var slideshow_interval = 3000;
var slideshow_repeat = false;
var slideshow_random = false;

var edited_person_id = -1;
var edited_location_id = -1;
var edited_tag_id = -1;

var persons_order_by = 'lastname:asc,firstname:asc,description:asc';
var locations_order_by = 'name:asc,description:asc';
var tags_order_by = 'name:asc';

var pinned_file_ids = []

var fullscreen = false;

function filedb_init_index_page() {
    get_stats(function (result) {
        $("#stats_span").html('<span class="glyphicon glyphicon-file"></span>' + result["num_files"] +  ' <span class="glyphicon glyphicon-user"></span> ' + result["num_persons"] + ' <span class="glyphicon glyphicon-globe"></span> ' + result["num_locations"] + ' <span class="glyphicon glyphicon-tag"></span>' + result["num_tags"]);
    });
}

function get_stats(success_function) {
    $.getJSON("/api/stats", function (result) {
        success_function(result)
    });
}

function filedb_init_files_page() {
    $("#import_button").click(function () {
        import_files();
    });

    $("#add_files_from_directory_update_button").click(function () {
        fetch_directories_to_add("/api/directories");
    });

    $("#add_files_from_directory_update_fs_button").click(function () {
        fetch_directories_to_add("/api/fs_directories");
    });

    $("#add_files_from_directory_add_button").click(function () {
        var directory_to_add = $("#add_files_directory_list .selectedLi").text();
        if (directory_to_add) {
            post_add_directory(directory_to_add);
        }
    });

    $("#delete_files_from_directory_update_button").click(function () {
        fetch_directories_to_delete();
    });

    $("#delete_files_from_directory_delete_button").click(function () {
        var directory_to_delete = $("#delete_files_directory_list .selectedLi").text();
        if (directory_to_delete) {
            delete_delete_directory(directory_to_delete);
        }
    });

    $("#delete_files_from_filelist_button").click(function () {
        delete_files_from_filelist();
    });

    $("#rename_directory_update_button").click(function () {
        fetch_directories_for_rename();
    });

    $("#rename_directory_rename_button").click(function () {
        var input = $('#rename_files_from_filelist_input').val().trim();
        var source_file_ids = parse_file_list_ids(input);
        if (source_file_ids.length == 0) {
            alert("Specify a file list");
            return;
        }

        var destination_directory = $("#rename_directory_destination_list .selectedLi").text();
        if (destination_directory) {
            if (window.confirm("Rename " + source_file_ids.length + " files to destination directory " + destination_directory + "?")) {
                rename_files(source_file_ids, destination_directory);
            }
        }
        else {
            alert("Specify a destination directory");
        }
    });

    $("#consistency_check_button").click(function () {
        consistency_check();
    });

    $("#duplicate_files_button").click(function () {
        duplicate_files_finder();
    });
}

function fetch_directories_to_add(url) {
    clear_manage_files_results();
    $("#add_files_directory_list").html("");
    $("#add_files_status").text("Fetching directories...");
    $.getJSON(url, function (result) {
        var directories = result['directories'];
        if (directories.length > 0) {
            for (var i=0, directory; directory = directories[i]; i++) {
                $("#add_files_directory_list").append('<li><a href="#">' + directory + "</a></li>");
            }
            $("#add_files_from_directory_add_button").removeAttr('disabled');
            // Add a "selected class" when list items clicked to be able to find it later
            $("#add_files_directory_list li a").click(function () {
                $('.selectedLi').removeClass('selectedLi');
                $(this).addClass('selectedLi');
            });
        }
        $("#add_files_status").text("Fetching directories... Done");
    });
}

function fetch_directories_to_delete() {
    clear_manage_files_results();
    $("#delete_files_directory_list").html("");
    $("#delete_files_status").text("Fetching directories...");
    $.getJSON('/api/directories', function (result) {
        var directories = result['directories'];
        if (directories.length > 0) {
            for (var i=0, directory; directory = directories[i]; i++) {
                $("#delete_files_directory_list").append('<li><a href="#">' + directory + "</a></li>");
            }
            $("#delete_files_from_directory_delete_button").removeAttr('disabled');
            // Add a "selected class" when list items clicked to be able to find it later
            $("#delete_files_directory_list li a").click(function () {
                $('.selectedLi').removeClass('selectedLi');
                $(this).addClass('selectedLi');
            });
        }
        $("#delete_files_status").text("Fetching directories... Done");
    });
}

function fetch_directories_for_rename() {
    clear_manage_files_results();
    $("#rename_directory_destination_list").html("");
    $("#rename_directory_status").text("Fetching destination directories...");

    $.getJSON('/api/fs_directories', function (result) {
        var directories = result['directories'];
        if (directories.length > 0) {
            for (var i=0, directory; directory = directories[i]; i++) {
                $("#rename_directory_destination_list").append('<li><a href="#">' + directory + "</a></li>");
            }
            $("#rename_directory_rename_button").removeAttr('disabled');
            // Add a "selected class" when list items clicked to be able to find it later
            $("#rename_directory_destination_list li a").click(function () {
                $('#rename_directory_destination_list .selectedLi').removeClass('selectedLi');
                $(this).addClass('selectedLi');
            });
        }
        $("#rename_directory_status").text("Fetching destination directories... Done");
    });
}

function rename_files(source_file_ids, destination_directory) {
    clear_manage_files_results();
    var jsonData = {"sourcefiles": source_file_ids, "destinationdir": destination_directory};
    $.ajax
    ({
        type: 'PUT',
        url: '/api/renamefiles',
        contentType: 'application/json',
        data: JSON.stringify(jsonData),
        dataType: "json",
        success: function (responseData) {
            $("#rename_directory_status").text('Rename files success');
        },
        error: function () {
            $("#rename_directory_status").text('Rename files failed');
        }
    });
}

function filedb_init_categorize_page() {
    load_pinned_file_ids();

    get_persons();
    get_locations();
    get_tags();

    $('#find_noncategorized_files_button').click(function () {
        categorize_noncategorized_files();
    });

    $('#find_pinned_files_button').click(function () {
        categorize_pinned_files();
    });

    $('#find_all_files_button').click(function () {
        categorize_all_files();
    });

    $('#categorize_by_path_button').click(function () {
        categorize_from_path_search();
    });

    $('#categorize_exported_list_of_files_button').click(function () {
        categorize_from_exported_search();
    });

    $('#first_file_categorize_button').click(function () {
        first_categorize_file();
    });

    $('#prev_file_categorize_button').click(function () {
        prev_categorize_file();
    });

    $('#next_file_categorize_button').click(function () {
        next_categorize_file();
    });

    $('#last_file_categorize_button').click(function () {
        last_categorize_file();
    });

    $('#prev_directory_categorize_button').click(function () {
        prev_directory_categorize_file();
    });

    $('#next_directory_categorize_button').click(function () {
        next_directory_categorize_file();
    });

    $('#reset_file_categorize_button').click(function () {
        reset_file_categorization();
    });

    $('#save_file_categorize_button').click(function () {
        save_file_categorization();
    });

    $('#categorize_add_files_locations').click(function () {
        add_files_locations();
    });

    $('#categorize_remove_files_locations').click(function () {
        remove_files_locations();
    });

    $('#categorize_add_files_persons').click(function () {
        add_files_persons();
    });

    $('#categorize_remove_files_persons').click(function () {
        remove_files_persons();
    });

    $('#categorize_add_files_tags').click(function () {
        add_files_tags();
    });

    $('#categorize_remove_files_tags').click(function () {
        remove_files_tags();
    });
}

function filedb_init_browse_page() {
    load_pinned_file_ids();

    get_persons();
    get_locations();
    get_tags();

    $('#file_path_regexp_button').click(function () {
        search_files_by_path();
    });

    $('#file_description_regexp_button').click(function () {
        search_files_by_description();
    });

    $('#file_date_regexp_button').click(function () {
        search_files_by_datetime();
    });

    $("#reset_search_criteria_button").click(function () {
        reset_search_criteria();
    });

    $("#clear_search_button").click(function () {
        clear_search_result();
    });

    $("#search_files_by_persons_button").click(function () {
        search_files_by_persons();
    });

    $("#search_files_by_locations_button").click(function () {
        search_files_by_locations();
    });

    $("#search_files_by_tags_button").click(function () {
        search_files_by_tags();
    });

    $("#search_files_by_all_button").click(function () {
        search_files_by_all();
    });

    $("#map_position_search_button").click(function () {
        search_files_by_map();
    });

    $("#exported_list_of_files_button").click(function () {
        search_files_by_exported_file_list();
    });

    $("#pinned_files_button").click(function () {
        search_files_by_pinned_file_list();
    });

    $("#clear_pinned_files_button").click(function () {
        clear_pinned_files();
    });

    $("#search_all_files_button").click(function () {
        clear_previous_search();
        search_all_files(update_search_result);
    });

    $("#search_ten_random_files_button").click(function () {
        search_files_by_random(10);
    });

    $('#slideshow_restart_button').click(function () {
        slideshow_off();
        restart_slideshow();
    });

    $('#slideshow_end_button').click(function () {
        slideshow_off();
        end_slideshow();
    });

    $('#slideshow_fullscreen_button').click(function () {
        open_fullscreen_slideshow();
    });

    $('#slideshow_pin_button').click(function () {
        toggle_pinned_file();
    });

    $('#slideshow_prev_file_button').click(function () {
        slideshow_off();
        prev_slideshow_file();
    });

    $('#slideshow_next_file_button').click(function () {
        slideshow_off();
        next_slideshow_file();
    });

    $('#slideshow_prev_directory_button').click(function () {
        slideshow_off();
        prev_directory_slideshow();
    });

    $('#slideshow_next_directory_button').click(function () {
        slideshow_off();
        next_directory_slideshow();
    });

    $('#slideshow_toggle_random_button').click(function () {
        toggle_slideshow_random();
    });

    $("#slideshow_toggle_button").click(function () {
        toggle_slideshow();
    });

    $("#slideshow_toggle_repeat_button").click(function () {
        toggle_slideshow_repeat();
    });

    $('#export_file_list').click(function () {
        export_file_list();
    });

    $('#export_absolute_paths').click(function () {
        export_absolute_paths();
    });

    $('#export_relative_paths').click(function () {
        export_relative_paths();
    });

    $('#export_zip_file').click(function () {
        export_zip_file();
    });

    $('#export_m3u_file').click(function () {
        export_m3u_file();
    });

    $('#export_pls_file').click(function () {
        export_pls_file();
    });

    $('#export_google_maps_route').click(function () {
        export_google_maps_route();
    });

    $('#filelist1_update_button').click(function () {
        filelist1_update();
    });

    $('#filelist2_update_button').click(function () {
        filelist2_update();
    });

    $('#filelists_union_button').click(function () {
        filelists_union();
    });

    $('#filelists_intersection_button').click(function () {
        filelists_intersection();
    });

    $('#filelists_difference_button').click(function () {
        filelists_difference();
    });

    $('#copy_filelists_result_button').click(function () {
        filelists_copy_result();
    });

    // Standard syntax
    document.addEventListener("fullscreenchange", function() {
        fullscreen_browser_changed();
    });

    // Firefox
    document.addEventListener("mozfullscreenchange", function() {
        fullscreen_browser_changed();
    });

    // Chrome, Safari and Opera
    document.addEventListener("webkitfullscreenchange", function() {
        fullscreen_browser_changed();
    });

    // IE / Edge
    document.addEventListener("msfullscreenchange", function() {
        fullscreen_browser_changed();
    });

    $('body').keydown(function (e) {
        // Setup fullscreen controls
        //alert("keypress: " + e.which);
        if (fullscreen) {
            if (e.which == 39) {
                // Left pressed
                slideshow_off();
                next_slideshow_file();
                e.preventDefault();
            }
            else if (e.which == 37) {
                // Right pressed
                slideshow_off();
                prev_slideshow_file();
                e.preventDefault();
            }
            else if (e.which == 33) {
                // Page-up pressed
                slideshow_off();
                prev_directory_slideshow();
                e.preventDefault();
            }
            else if (e.which == 34) {
                // Page-down pressed
                slideshow_off();
                next_directory_slideshow();
                e.preventDefault();
            }
            else if (e.which == 36) {
                // Home pressed
                slideshow_off();
                restart_slideshow();
                e.preventDefault();
            }
            else if (e.which == 35) {
                // End pressed
                slideshow_off();
                end_slideshow();
                e.preventDefault();
            }
            else if (e.which == 13 || e.which == 32) {
                // Enter or space pressed
                toggle_slideshow();
                e.preventDefault();
            }
            else if (e.which == 80) {
                // P pressed
                toggle_pinned_file();
                e.preventDefault();
            }
        }
    });
}

function filedb_init_birthdays_page() {
    get_persons();
}

function filedb_init_categories_page() {
    get_persons();
    get_locations();
    get_tags();

    $("#add_person_form").submit(function (evt) {
        evt.preventDefault();
        modify_person();
    });

    $("#add_location_form").submit(function (evt) {
        evt.preventDefault();
        modify_location();
    });

    $("#add_tag_form").submit(function (evt) {
        evt.preventDefault();
        modify_tag();
    });
}

function load_pinned_file_ids() {
    var pinned_file_ids_str = localStorage.getItem("filedb_pinned_files");
    if (pinned_file_ids_str) {
        var pinned_file_ids_strs = pinned_file_ids_str.split(';');

        for (var i=0; i<pinned_file_ids_strs.length; i++) {
            var pinned_file_id_str = pinned_file_ids_strs[i];
            if (pinned_file_id_str.length > 0) {
                var pinned_file_id = parseInt(pinned_file_id_str);
                if (!Number.isNaN(pinned_file_id)) {
                    pinned_file_ids.push(pinned_file_id);
                }
            }
        }

    }

    pinned_files_modified();
}

function create_pinned_files_str() {
    var str = "";
    for (var i=0; i<pinned_file_ids.length; i++) {
        str += pinned_file_ids[i] + ";";
    }
    return str;
}

function store_pinned_file_ids() {
    var pinned_file_ids_str = create_pinned_files_str();

    if (pinned_file_ids_str.length > 0) {
        localStorage.setItem("filedb_pinned_files", pinned_file_ids_str);
    }
    else {
        localStorage.removeItem("filedb_pinned_files");
    }
}

function toggle_pinned_file() {
    var file_id = slideshow_files[slideshow_index]['id'];
    var idx = pinned_file_ids.indexOf(file_id);
    if (idx != -1) {
        pinned_file_ids.splice(idx, 1);
    }
    else {
        pinned_file_ids.push(file_id);
    }
    store_pinned_file_ids();
    pinned_files_modified();
}

function clear_pinned_files() {
    if (window.confirm("Remove pin from " + pinned_file_ids.length + " files?")) {
        pinned_file_ids = [];
        store_pinned_file_ids();
        pinned_files_modified();
    }
}

function pinned_files_modified() {
    $('#pinned_files_input').val(create_pinned_files_str());
    $("#clear_pinned_files_button").prop('disabled', pinned_file_ids.length == 0);
    update_slideshow_buttons();
    if (slideshow_index != -1) {
        load_slideshow_text();
    }
}

function get_persons() {
    $.getJSON("/api/persons?orderby=" + persons_order_by, function (result) {
        persons = result['persons'];

        if ($('#multiplepersonselect').length) {
            var personOptions = "";
            for (var i=0, person; person = persons[i]; i++) {
                personOptions += '<option value="' + person['id'] + '">' + get_person_span(person) + '</option>';
            }
            $("#multiplepersonselect").html(personOptions);
        }

        if ($('#personsdiv').length) {
            reload_persons_table();
        }

        if ($('#person_categories').length) {
            var labels = '';
            for (var i=0, person; person = persons[i]; i++) {
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + get_person_span(person) + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $('#person_categories').html(labels);
        }

        if ($('#birthdays_page').length) {
            var persons_with_dateofbirth = [];
            for (var i=0, person; person = persons[i]; i++) {
                if (person['dateofbirth'] != null) {
                    persons_with_dateofbirth.push(person);
                }
            }

            // Sort persons by birthdays
            persons_with_dateofbirth.sort(birthday_sort);

            var start_index = 0;
            var now = new Date();

            // Rotate persons to get nearest birthday first
            for (var i=0; i < persons_with_dateofbirth.length; i++) {
                var person_date = new Date(persons_with_dateofbirth[0]['dateofbirth']);
                person_date.setFullYear(0);
                if (now.getMonth() < person_date.getMonth() || (now.getMonth() == person_date.getMonth() && now.getDate() <= person_date.getDate())) {
                    break;
                }
                var p = persons_with_dateofbirth.shift();
                persons_with_dateofbirth.push(p);
            }

            // Show persons
            for (var i=0, person; person = persons_with_dateofbirth[i]; i++) {
                var date = new Date(person['dateofbirth']);
                var date_str = date.getDate() + ' ' + date.toLocaleString("en-us", { month: "short" });
                var has_birthday = now.getMonth() == date.getMonth() && now.getDate() == date.getDate();
                var birthday_marker = '';
                var thumbnail = '';
                if (has_birthday) {
                    birthday_marker = '<span class="glyphicon glyphicon-flag"></span> ';
                    if (person['profilefileid'] != null) {
                        thumbnail = '<br><br><a href="/api/filecontent/' + person['profilefileid'] + '"><img src="/api/thumbnail/' + person['profilefileid'] + '" alt="File id: ' + person['profilefileid'] + '" title="File id: ' + person['profilefileid'] + '"/></a>'
                    }
                }
                $('#birthdays_person_table > tbody:last-child').append('<tr><td>' + birthday_marker + person['firstname'] + ' ' + person['lastname'] + thumbnail + '</td><td>' + date_str + '</td></tr>');
            }
       }
    });
}

function birthday_sort(person1, person2) {
    var person1_date = new Date(person1['dateofbirth']);
    var person2_date = new Date(person2['dateofbirth']);

    person1_date.setFullYear(0);
    person2_date.setFullYear(0);

    if (person1_date < person2_date) {
        return -1;
    }
    else if (person1_date > person2_date) {
        return 1;
    }

    var name1 = person1['firstname'] + ' ' + person1['lstname'];
    var name2 = person2['firstname'] + ' ' + person2['lstname'];
    if (name1 < name2) {
        return -1;
    }
    return 1;
}

function reload_persons_table() {
    if (persons.length > 0) {
        // TODO: do not set table id? instead search for the table inside personsdiv below?
        $('#personsdiv').html('<table class="table" id="personstable"><tr><th id="persons_firstname_col_header">First Name <span id="sort_by_person_first_name_icon"></span></th><th id="persons_lastname_col_header">Last Name <span id="sort_by_person_last_name_icon"></span></th><th id="persons_description_col_header">Description  <span id="sort_by_person_description_icon"></span></th><th id="persons_age_col_header">Born Years Ago  <span id="sort_by_person_age_icon"></span></th><th id="persons_dateofbirth_col_header">Date of Birth  <span id="sort_by_person_dateofbirth_icon"></span></th><th>Profile File Id</th><th>Actions</th></tr></table>');

        $("#sort_by_person_last_name_icon").removeClass("glyphicon glyphicon-triangle-bottom");
        if (persons_order_by.indexOf('firstname') == 0) {
            $("#sort_by_person_first_name_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }
        else if (persons_order_by.indexOf('lastname') == 0) {
            $("#sort_by_person_last_name_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }
        else if (persons_order_by.indexOf('description') == 0) {
            $("#sort_by_person_description_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }
        else if (persons_order_by.indexOf('dateofbirth:desc') == 0) {
            $("#sort_by_person_age_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }
        else if (persons_order_by.indexOf('dateofbirth:asc') == 0) {
            $("#sort_by_person_dateofbirth_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }

        $('#persons_firstname_col_header').click(function () {
            clear_edit_person();
            persons_order_by = 'firstname:asc,lastname:asc,description:asc'
            get_persons();
        });

        $('#persons_lastname_col_header').click(function () {
            clear_edit_person();
            persons_order_by = 'lastname:asc,firstname:asc,description:asc'
            get_persons();
        });

        $('#persons_description_col_header').click(function () {
            clear_edit_person();
            persons_order_by = 'description:asc,lastname:asc,firstname:asc';
            get_persons();
        });

        $('#persons_age_col_header').click(function () {
            clear_edit_person();
            persons_order_by = 'dateofbirth:desc,lastname:asc,firstname:asc,description:asc';
            get_persons();
        });

        $('#persons_dateofbirth_col_header').click(function () {
            clear_edit_person();
            persons_order_by = 'dateofbirth:asc,lastname:asc,firstname:asc,description:asc';
            get_persons();
        });

        var now = new Date();

        var personRows = '';
        for (var i=0, person; person = persons[i]; i++) {
            var dateofbirth = person['dateofbirth'];
            var age = null;
            if (dateofbirth != null) {
                age = get_age(dateofbirth, now);
            }
            var person_profile;
            if (person['profilefileid'] != null) {
                person_profile = '<a href="/api/filecontent/' + person['profilefileid'] +'"><img src="/api/thumbnail/' + person['profilefileid'] + '" title="File id: ' + person['profilefileid'] + '" alt="File id: ' + person['profilefileid'] + '"/></a>';
            }
            else {
                person_profile = 'N/A';
            }
            personRows += '<tr id="tr_person_' + person['id'] + '"><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td>' + person_profile + '</td><td><a href="#persons_header" class="edit_person_button" id="edit_person_' + person['id'] + '">Edit</a>, <a href="" class="delete_person_button" id="delete_person_' + person['id'] + '">Delete</a></td></tr>';
        }
        $("#personstable").append(personRows);

        $(".edit_person_button").click(function (evt) {
            var id = $(this).attr('id').replace('edit_person_', '');
            if (id == edited_person_id) {
                clear_edit_person();
                return false; // do not follow link
            }
            else if (edited_person_id == -1) {
                prepare_edit_person(id);
                return true; // do follow link
            }
        });

        $(".delete_person_button").click(function (evt) {
            var id = $(this).attr('id').replace('delete_person_', '');
            delete_person(id);
            return false; // do not follow link
        });
    }
    else {
        $('#personsdiv').text('No persons added yet.');
    }
}

function get_locations() {
    $.getJSON("/api/locations?orderby=" + locations_order_by, function (result) {
        locations = result['locations'];

        if ($('#multiplelocationselect').length) {
            var options = "";
            for (var i=0, location; location = locations[i]; i++) {
                options += '<option value="' + location['id'] + '">' + get_location_span(location) + '</option>';
            }
            $('#multiplelocationselect').html(options);
        }

        if ($('#locationsdiv').length) {
            reload_locations_table();
        }

        if ($('#location_categories').length) {
            var labels = '';
            for (var i=0, location; location = locations[i]; i++) {
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + get_location_span(location) + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $('#location_categories').html(labels);
        }
    });
}

function reload_locations_table() {
    if (locations.length > 0) {
        // TODO: do not set table id? instead search for the table inside locationsdiv below?
        $('#locationsdiv').html('<table class="table" id="locationstable"><tr><th id="locations_name_col_header">Name <span id="sort_by_location_name_icon"></span></th><th id="locations_description_col_header">Description <span id="sort_by_location_description_icon"></span></th><th>Position (Latitude and Longitude)</th><th>Actions</th></tr></table>');

        if (locations_order_by.indexOf('name') == 0) {
            $("#sort_by_location_name_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }
        else if (locations_order_by.indexOf('description') == 0) {
            $("#sort_by_location_description_icon").addClass("glyphicon glyphicon-triangle-bottom");
        }

        $('#locations_name_col_header').click(function () {
            clear_edit_location();
            locations_order_by = 'name:asc,description:asc';
            get_locations();
        });

        $('#locations_description_col_header').click(function () {
            clear_edit_location();
            locations_order_by = 'description:asc,name:asc';
            get_locations();
        });

        var locationRows = "";
        for (var i=0, location; location = locations[i]; i++) {
            locationRows += '<tr id="tr_location_' + location['id'] + '"><td>' + location['name'] + '</td><td>' + get_printable_value(location['description']) + '</td><td>' + get_position_map_link(location['position']) + '</td><td><a href="#locations_header" class="edit_location_button" id="edit_location_' + location['id'] + '">Edit</a>, <a href="" class="delete_location_button" id="delete_location_' + location['id'] + '">Delete</a></td></tr>';
        }
        $("#locationstable").append(locationRows);

        $(".edit_location_button").click(function () {
            var id = $(this).attr('id').replace('edit_location_', '');
            if (id == edited_location_id) {
                clear_edit_location();
                return false; // do not follow link
            }
            else if (edited_location_id == -1) {
                prepare_edit_location(id);
                return true; // do follow link
            }
        });

        $(".delete_location_button").click(function () {
            var id = $(this).attr('id').replace('delete_location_', '');
            delete_location(id);
            return false; // do not follow link
        });
    }
    else {
        $('#locationsdiv').text('No locations added yet.');
    }
}

function get_tags() {
    $.getJSON("/api/tags?orderby=" + tags_order_by, function (result) {
        tags = result['tags'];

        if ($('#multipletagselect').length) {
            var options = "";
            for (var i=0, tag; tag = tags[i]; i++) {
                options += '<option value="' + tag['id'] + '">' + tag['name'] + '</option>';
            }
            $('#multipletagselect').html(options);
        }

        if ($('#tagsdiv').length) {
            reload_tags_table();
        }

        if ($('#tag_categories').length) {
            var labels = '';
            $('#tag_categories').empty();
            for (var i=0, tag; tag = tags[i]; i++) {
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $("#tag_categories").html(labels);
        }
    });
}

function reload_tags_table() {
    if (tags.length > 0) {
        // TODO: do not set table id? istead search for the table inside tagsdiv below?
        $('#tagsdiv').html('<table class="table" id="tagstable"><tr><th>Name <span class="glyphicon glyphicon-triangle-bottom"></span></th><th>Actions</th></tr></table>');

        var tagRows = "";
        for (var i=0, tag; tag = tags[i]; i++) {
            tagRows += '<tr id="tr_tag_' + tag['id'] + '"><td>' + tag['name'] + '</td><td><a href="#tags_header" class="edit_tag_button" id="edit_tag_' + tag['id'] + '">Edit</a>, <a href="" class="delete_tag_button" id="delete_tag_' + tag['id'] + '">Delete</a></td></tr>';
        }
        $("#tagstable").append(tagRows);

        // Note: no click handler is set for column sorting, because there is only one column.

        $(".edit_tag_button").click(function () {
            var id = $(this).attr('id').replace('edit_tag_', '');
            if (id == edited_tag_id) {
                clear_edit_tag();
                return false; // do not follow link
            }
            else if (edited_tag_id == -1) {
                prepare_edit_tag(id);
                return true; // do follow link
            }
        });

        $(".delete_tag_button").click(function () {
            var id = $(this).attr('id').replace('delete_tag_', '');
            delete_tag(id);
            return false; // do not follow link
        });
    }
    else {
        $('#tagsdiv').text('No tags added yet.');
    }
}

function clear_consistency_check_files_table() {
    $("#consistency_check_files_table").empty();
}

function update_consistency_check_files_table(files_json) {
    var tableRows = '<tr><th>File</th><th>Description</th><th>Age</th><th>Date and Time</th><th>Persons</th><th>Locations</th><th>Tags</th><th>Actions</th></tr>';
    var now = new Date();
    for (var i=0, file; file = files_json[i]; i++) {
        var datetime = file['datetime'];
        var age = null;
        if (datetime != null) {
            age = get_age(datetime, now);
        }
        var numPersons = file['persons'].length;
        var numLocations = file['locations'].length;
        var numTags = file['tags'].length;
        var fileId = file['id'];
        tableRows += '<tr id="filerow_' + fileId + '"><td><a href="/api/filecontent/' + fileId + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + numPersons + '</td><td>' + numLocations + '</td><td>' + numTags + '</td><td><a href="" class="delete_file_button" id="delete_file_' + fileId + '">Delete</a>, <a href="/api/fileexif/' + fileId + '">Exif</a></td></tr>';
    }

    $("#consistency_check_files_table").empty();
    $("#consistency_check_files_table").append(tableRows);

    $(".delete_file_button").click(function () {
        var id = $(this).attr('id').replace('delete_file_', '');
        delete_file(id);
        return false; // do not follow link
    });
}

function clear_duplicate_files_table() {
    $("#duplicate_files_table").empty();
}

function update_duplicate_files_table(duplicate_files_json) {
    var tableRows = '<tr><th>Date and Time</th><th>Files</th></tr>';
    for (var i=0, duplicate_file; duplicate_file = duplicate_files_json[i]; i++) {

        var datetime = null;
        var file_list = "";

        for (var j=0, file; file = duplicate_file[j]; j++) {
            if (datetime == null) {
                datetime = get_printable_datetime(file['datetime']);
            }
            file_list += file['id'] + ';';
        }

        tableRows += '<tr><td>' + datetime + '</td><td>' + file_list + '</td></tr>';
    }

    $("#duplicate_files_table").empty();
    $("#duplicate_files_table").append(tableRows);
}

function reset_file_categorization() {
    if (categorize_index != -1) {
        categorize_file();
    }
}

function first_categorize_file() {
    if (categorize_index > 0) {
        categorize_index = 0;
        categorize_file();
    }
}

function prev_categorize_file() {
    if (categorize_index > 0) {
        categorize_index--;
        categorize_file();
    }
}

function next_categorize_file() {
    if (categorize_index != -1 && categorize_index < categorize_files.length - 1) {
        categorize_index++;
        categorize_file();
    }
}

function last_categorize_file() {
    if (categorize_files.length > 0 && categorize_index != categorize_files.length - 1) {
        categorize_index = categorize_files.length - 1;
        categorize_file();
    }
}

function prev_directory_categorize_file() {
    var current_dir = get_directory_from_path(categorize_files[categorize_index]['path']);
    var previous_dir = null;
    for (var i=categorize_index-1; i>=0; i--) {
        var dir = get_directory_from_path(categorize_files[i]['path']);
        if (previous_dir == null) {
            if (current_dir != dir) {
                previous_dir = dir;
            }
        }
        else {
            if (previous_dir != dir) {
                categorize_index = i+1;
                categorize_file();
                return;
            }
        }
    }

    if (previous_dir != null) {
        categorize_index = 0;
        categorize_file();
    }
}

function next_directory_categorize_file() {
    var current_dir = get_directory_from_path(categorize_files[categorize_index]['path']);
    for (var i=categorize_index+1; i<categorize_files.length; i++) {
        var dir = get_directory_from_path(categorize_files[i]['path']);
        if (current_dir != dir) {
            categorize_index = i;
            categorize_file();
            break;
        }
    }
}

function categorize_file() {
    var file = categorize_files[categorize_index];
    var file_description = file['description'];
    var file_date = file['datetime'];
    var file_url = '/api/filecontent/' + file['id'];

    $('#categorize_save_status').text('');
    $('#categorize_file_header').text(": [" + (categorize_index+1) + "/" + categorize_files.length + "] " + file['path']);

    if (file_description != null) {
        $('#file_description').val(file_description);
    }
    else {
        $('#file_description').val("");
    }

    if (file_date != null) {
        $('#file_date').val(file_date);
    }
    else {
        $('#file_date').val("");
    }

    for (var i=0, person; person = persons[i]; i++) {
        var file_has_person = file['persons'].indexOf(person['id']) != -1;
        $('#person_' + person['id']).prop('checked', file_has_person);
    }

    for (var i=0, location; location = locations[i]; i++) {
        var file_has_location = file['locations'].indexOf(location['id']) != -1;
        $('#location_' + location['id']).prop('checked', file_has_location);
    }

    for (var i=0, tag; tag = tags[i]; i++) {
        var file_has_tag = file['tags'].indexOf(tag['id']) != -1;
        $('#tag_' + tag['id']).prop('checked', file_has_tag);
    }

    $('#categorize_image_div').empty();

    // Make a HEAD request to find out file type (it is not known from the URL)
    // TODO: this code is duplicated from the browse page part
    $.ajax({
        type: "HEAD",
        url: file_url,
        success: function (data, textStatus, xhr) {
            var content_type = xhr.getResponseHeader("content-type") || "";
            if (is_content_type_image(content_type)) {
                var img = $('<img />', {
                    id: 'categorize_image',
                    src: file_url,
                    alt: file_url,
                    title: 'File id: ' + file['id'],
                    class: 'limited_img'
                });
                img.appendTo($('#categorize_image_div'));
            }
            else {
                // Note: target blank to not clear search result
                $('#categorize_image_div').html('<a href="' + file_url + '" target="_blank">Open file of type ' + content_type + '</a>');
            }
            update_image_div_height('#categorize_image_div');
        },
        error: function () {
            // TODO: show a bootstrap error div and add a link
            $('#categorize_image_div').html('Unable to load file, see <a href="/help#troubleshooting">troubleshooting</a>!');
            update_image_div_height('#categorize_image_div');
        }
    });
}

function update_image_div_height(selector) {
    set_div_height(selector, 0.75);
}

function set_div_height(selector, factor) {
    var height = $(selector).width() * factor;
    $(selector).css({'height': height + 'px'});
}

function categorize_noncategorized_files() {
    clear_categorize_result();
    search_non_categorized_files(update_categorize_result);
}

function categorize_pinned_files() {
    if (pinned_file_ids.length > 0) {
        clear_categorize_result();
        search_files_by_file_list(pinned_file_ids, update_categorize_result);
    }
    else {
        alert("No files pinned yet");
    }
}

function categorize_all_files() {
    clear_categorize_result();
    search_all_files(update_categorize_result);
}

function categorize_from_path_search() {
    var path_regexp = $('#categorize_by_path_input').val().trim();
    if (path_regexp.length > 0) {
        var url = '/api/files?pathregexp=' + path_regexp;
        $.getJSON(url, function (result) {
            update_categorize_result(result);
        });
    }
    else {
        alert("Enter a regular expression for your path");
    }
}

function categorize_from_exported_search() {
    var file_list_str = $('#categorize_exported_list_of_files_input').val().trim();
    var file_ids = parse_file_list_ids(file_list_str);
    if (file_ids.length > 0) {
        clear_categorize_result();
        search_files_by_file_list(file_ids, update_categorize_result);
    }
    else {
        alert("Export a search result to get a list of files");
    }
}

function update_categorize_result(files_json) {
    categorize_files = files_json["files"];
    if (categorize_files.length > 0) {
        categorize_index = 0;
        categorize_file();

        var directories = get_directories_from_files(categorize_files);
        $('#categorize_search_result_text').html(directories.join('<br>'));
    }
    else {
        clear_categorize_result();
    }
}

function clear_categorize_result() {
    $('#categorize_search_result_text').text("No search result available");

    $('#categorize_file_header').text("");
    $('#categorize_save_status').text('');
    $('#file_description').val("");
    $('#file_date').val("");
    if ($('#categorize_image').length) {
        $('#categorize_image').attr('src', '');
        $('#categorize_image').attr('alt', '');
    }
    for (var i=0, person; person = persons[i]; i++) {
        $('#person_' + person['id']).prop('checked', false);
    }
    for (var i=0, location; location = locations[i]; i++) {
        $('#location_' + location['id']).prop('checked', false);
    }
    for (var i=0, tag; tag = tags[i]; i++) {
        $('#tag_' + tag['id']).prop('checked', false);
    }
}

function get_categorize_selected_person_ids() {
    var person_ids = [];
    for (var i=0, person; person = persons[i]; i++) {
        var id = "person_" + person['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked) {
            person_ids.push(person['id']);
        }
    }
    return person_ids;
}

function get_categorize_selected_location_ids() {
    var location_ids = [];
    for (var i=0, location; location = locations[i]; i++) {
        var id = "location_" + location['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked) {
            location_ids.push(location['id']);
        }
    }
    return location_ids;
}

function get_categorize_selected_tag_ids() {
    var tag_ids = [];
    for (var i=0, tag; tag = tags[i]; i++) {
        var id = "tag_" + tag['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked) {
            tag_ids.push(tag['id']);
        }
    }
    return tag_ids;
}

function createJsonDataForFileCategorization() {
    var selected_persons = get_categorize_selected_person_ids();
    var selected_locations = get_categorize_selected_location_ids();
    var selected_tags = get_categorize_selected_tag_ids();

    var description = $('#file_description').val().trim();
    if (description == "") {
        description = null;
    }

    var datetime = $('#file_date').val().trim();
    if (datetime == "") {
        datetime = null;
    }

    var jsonData = JSON.stringify(
    {
        "persons": selected_persons,
        "locations": selected_locations,
        "tags": selected_tags,
        "description": description,
        "datetime": datetime
    });

    return jsonData;
}

function find_categorize_file_index_from_file_id(file_id) {
    for (var i=0; i<categorize_files.length; i++) {
        if (categorize_files[i]['id'] == file_id) {
            return i;
        }
    }
    return -1;
}

function save_file_categorization() {
    if (categorize_index != -1) {
        var jsonData = createJsonDataForFileCategorization();

        $("#categorize_save_status").text("Saving...");
        $.ajax
        ({
            type: "PUT",
            url: '/api/file/' + categorize_files[categorize_index]['id'],
            contentType : 'application/json',
            data: jsonData,
            dataType: "json",
            success: function (responseData) {
                $("#categorize_save_status").text("Saved successfully");
                categorize_files[categorize_index] = responseData;
            },
            error: function () {
                $("#categorize_save_status").text("An error occured");
            }
        });
    }
    else {
        show_no_categorize_result();
    }
}

function get_categorize_file_ids() {
    var file_ids = [];
    for (var i=0; i<categorize_files.length; i++) {
        file_ids.push(categorize_files[i]['id']);
    }
    return file_ids;
}

function add_files_locations() {
    if (window.confirm("Add selected locations to search result files?")) {
        modify_files_locations('PUT');
    }
}

function remove_files_locations() {
    if (window.confirm("Remove selected locations from search result files?")) {
        modify_files_locations('DELETE');
    }
}

function add_files_persons() {
    if (window.confirm("Add selected persons to search result files?")) {
        modify_files_persons('PUT');
    }
}

function remove_files_persons() {
    if (window.confirm("Remove selected persons from search result files?")) {
        modify_files_persons('DELETE');
    }
}

function add_files_tags() {
    if (window.confirm("Add selected tags to search result files?")) {
        modify_files_tags('PUT');
    }
}

function remove_files_tags() {
    if (window.confirm("Remove selected tags from search result files?")) {
        modify_files_tags('DELETE');
    }
}

function modify_files_locations(type) {
    var file_ids = get_categorize_file_ids();
    var location_ids = get_categorize_selected_location_ids();

    if (file_ids.length > 0) {
        if (location_ids.length == 0) {
            $("#categorize_save_status").text("No location selected");
        }
        else {
            $.ajax
            ({
                type: type,
                url: '/api/filelocations',
                contentType: 'application/json',
                data: JSON.stringify( { "files": file_ids, "locations": location_ids }),
                //dataType: "json",
                success: function (responseData) {
                    $('#categorize_save_status').text(file_ids.length + " files saved successfully");
                    // Reload files to make sure that client and server data is synchronized
                    clear_categorize_result();
                    search_files_by_file_list(file_ids, update_categorize_result);
                },
                error: function () {
                    $("#categorize_save_status").text("An error occured");
                }
            });
        }
    }
}

function modify_files_persons(type) {
    var file_ids = get_categorize_file_ids();
    var person_ids = get_categorize_selected_person_ids();

    if (file_ids.length > 0) {
        if (person_ids.length == 0) {
            $("#categorize_save_status").text("No person selected");
        }
        else {    
            $.ajax
            ({
                type: type,
                url: '/api/filepersons',
                contentType: 'application/json',
                data: JSON.stringify( { "files": file_ids, "persons": person_ids }),
                //dataType: "json",
                success: function (responseData) {
                    $('#categorize_save_status').text(file_ids.length + " files saved successfully");
                    // Reload files to make sure that client and server data is synchronized
                    clear_categorize_result();
                    search_files_by_file_list(file_ids, update_categorize_result);
                },
                error: function () {
                    $("#categorize_save_status").text("An error occured");
                }
            });
        }
    }
}

function modify_files_tags(type) {
    var file_ids = get_categorize_file_ids();
    var tag_ids = get_categorize_selected_tag_ids();

    if (file_ids.length > 0) {
        if (tag_ids.length == 0) {
            $("#categorize_save_status").text("No tag selected");
        }
        else {    
            $.ajax
            ({
                type: type,
                url: '/api/filetags',
                contentType: 'application/json',
                data: JSON.stringify( { "files": file_ids, "tags": tag_ids }),
                //dataType: "json",
                success: function (responseData) {
                    $('#categorize_save_status').text(file_ids.length + " files saved successfully");
                    // Reload files to make sure that client and server data is synchronized
                    clear_categorize_result();
                    search_files_by_file_list(file_ids, update_categorize_result);
                },
                error: function () {
                    $("#categorize_save_status").text("An error occured");
                }
            });
        }
    }
}

function show_no_categorize_result() {
    alert('Please find a file to categorize');
}

function create_files_url(include_persons, include_locations, include_tags, include_path_regexp, include_description_regexp, include_datetime_regexp) {
    var checked_persons = '';
    if (include_persons) {
        var selected_person_values = $('#multiplepersonselect').val();
        if (selected_person_values != null) {
            for (var i=0, value; value = selected_person_values[i]; i++) {
                checked_persons += value + ',';
            }
        }
        if (checked_persons != '') {
            checked_persons = checked_persons.slice(0, -1);
        }
    }

    var checked_locations = '';
    if (include_locations) {
        var selected_location_values = $('#multiplelocationselect').val();
        if (selected_location_values != null) {
            for (var i=0, value; value = selected_location_values[i]; i++) {
                checked_locations += value + ',';
            }
        }
        if (checked_locations != '') {
            checked_locations = checked_locations.slice(0, -1);
        }
    }

    var checked_tags = '';
    if (include_tags) {
        var selected_tag_values = $('#multipletagselect').val();
        if (selected_tag_values != null) {
            for (var i=0, value; value = selected_tag_values[i]; i++) {
                checked_tags += value + ',';
            }
        }
        if (checked_tags != '') {
            checked_tags = checked_tags.slice(0, -1);
        }
    }

    var path_regexp = '';
    if (include_path_regexp) {
        var regexp = $('#file_path_regexp_filter').val();
        if (regexp.length > 0) {
            path_regexp = encodeURIComponent(regexp);
        }
    }

    var description_regexp = '';
    if (include_description_regexp) {
        var regexp = $('#file_description_regexp_filter').val();
        if (regexp.length > 0) {
            description_regexp = encodeURIComponent(regexp);
        }
    }

    var datetime_regexp = '';
    if (include_datetime_regexp) {
        var regexp = $('#file_date_regexp_filter').val();
        if (regexp.length > 0) {
            datetime_regexp = encodeURIComponent(regexp);
        }
    }

    return '/api/files?personids=' + checked_persons + '&locationids=' + checked_locations + '&tagids=' + checked_tags + '&pathregexp=' + path_regexp + '&descriptionregexp=' + description_regexp + '&datetimeregexp=' + datetime_regexp;
}

function reset_search_criteria() {
    $("#multiplepersonselect option:selected").prop("selected", false);
    $("#multiplelocationselect option:selected").prop("selected", false);
    $("#multipletagselect option:selected").prop("selected", false);
    $('#file_path_regexp_filter').val('');
    $('#file_description_regexp_filter').val('');
    $('#file_date_regexp_filter').val('');
}

function clear_search_result() {
    $("#search_result_heading_postfix").text("");
    $("#search_result_text").text("No search result available");
    $("#search_result_directories").html("");
    $("#search_result_persons").html("");
    $("#search_result_locations").html("");
    $("#search_result_tags").html("");
    clear_previous_search();
    clear_slideshow();
}

function clear_previous_search() {
    // Clear any previous search result (error message or image)
    $('#file_browser_image_div').html('');
}

function search_files_by_persons() {
    clear_previous_search();
    if ($("#multiplepersonselect :selected").length > 0) {
        var url = create_files_url(true, false, false, false, false, false);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("No person selected");
    }
}

function search_files_by_locations() {
    clear_previous_search();
    if ($("#multiplelocationselect :selected").length > 0) {
        var url = create_files_url(false, true, false, false, false, false);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("No location selected");
    }
}

function search_files_by_tags() {
    clear_previous_search();
    if ($("#multipletagselect :selected").length > 0) {
        var url = create_files_url(false, false, true, false, false, false);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("No tag selected");
    }
}

function parse_file_list_ids(input_string) {
    var result = [];

    var file_id_strs = input_string.split(';');
    if (file_id_strs.length == 0) {
        return result;
    }

    for (var i=0; i<file_id_strs.length; i++) {
        var file_id_str = file_id_strs[i];
        if (file_id_str.length > 0) {
            var file_id = parseInt(file_id_strs[i]);
            if (!Number.isNaN(file_id)) {
                result.push(file_id);
            }
        }
    }

    return result;
}

function search_files_by_map() {
    var map_position_str = $('#map_position_input').val().trim();
    var map_position_radius_str = $('#map_position_radius_input').val().trim();
    var map_position_radius = parseInt(map_position_radius_str, 10);

    if (map_position_str.length > 0 && !Number.isNaN(map_position_radius)) {
        clear_previous_search();

        var jsonData = JSON.stringify({'position': map_position_str, 'radius': map_position_radius});
        $.ajax
        ({
            type: 'POST',
            url: '/api/files_near_position',
            contentType: 'application/json',
            data: jsonData,
            dataType: "json",
            success: function (result) {
                update_search_result(result);
            },
            error: function () {
                alert("Could not post data");
            }
        });
    }
    else {
        alert("Enter position and radius");
    }
}

function search_files_by_exported_file_list() {
    var file_list_str = $('#exported_list_of_files_input').val().trim();
    var file_ids = parse_file_list_ids(file_list_str);
    if (file_ids.length > 0) {
        clear_previous_search();
        search_files_by_file_list(file_ids, update_search_result);
    }
    else {
        alert("Export a search result to get a list of files");
    }
}

function search_files_by_pinned_file_list() {
    var file_list_str = $('#pinned_files_input').val().trim();
    var file_ids = parse_file_list_ids(file_list_str);
    if (file_ids.length > 0) {
        clear_previous_search();
        search_files_by_file_list(file_ids, update_search_result);
    }
    else {
        alert("No files pinned yet");
    }
}

function search_files_by_file_list(file_ids, success_function) {
    var jsonData = JSON.stringify({"files": file_ids});

    $.ajax
    ({
        type: 'POST',
        url: '/api/files',
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function (result) {
            success_function(result);
        },
        error: function () {
            alert("Could not post data");
        }
    });
}

function search_non_categorized_files(success_function) {
    var url = '/api/files_without_data';
    $.getJSON(url, function (result) {
        success_function(result);
    });
}

function search_all_files(success_function) {
    var url = '/api/files';
    $.getJSON(url, function (result) {
        success_function(result);
    });
}

function search_files_by_random(numfiles) {
    clear_previous_search();
    $.getJSON('/api/randomfiles/' + numfiles, function (result) {
        update_search_result(result);
    });
}

function search_files_by_all() {
    clear_previous_search();
    var url = create_files_url(true, true, true, true, true, true);
    $.getJSON(url, function (result) {
        update_search_result(result);
    });
}

function search_files_by_path() {
    clear_previous_search();
    var regexp = $('#file_path_regexp_filter').val();
    if (regexp.length > 0) {
        var url = create_files_url(false, false, false, true, false, false);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("Specify a file path regexp");
    }
}

function search_files_by_description() {
    clear_previous_search();
    var regexp = $('#file_description_regexp_filter').val();
    if (regexp.length > 0) {
        var url = create_files_url(false, false, false, false, true, false);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("Specify a file description regexp");
    }
}

function search_files_by_datetime() {
    clear_previous_search();
    var regexp = $('#file_date_regexp_filter').val();
    if (regexp.length > 0) {
        var url = create_files_url(false, false, false, false, false, true);
        $.getJSON(url, function (result) {
            update_search_result(result);
        });
    }
    else {
        alert("Specify a file date and time regexp");
    }
}

function update_search_result(files_json) {
    slideshow_files = files_json['files'];

    var persons = [];
    var locations = [];
    var tags = [];

    // Store unique persons, locations and tags from search result
    for (var i=0, file; file = slideshow_files[i]; i++) {
        for (var j=0, person_id; person_id = file['persons'][j]; j++) {
            if (persons.indexOf(person_id) == -1) {
                persons.push(person_id);
            }
        }
        for (var j=0, location_id; location_id = file['locations'][j]; j++) {
            if (locations.indexOf(location_id) == -1) {
                locations.push(location_id);
            }
        }
        for (var j=0, tag_id; tag_id = file['tags'][j]; j++) {
            if (tags.indexOf(tag_id) == -1) {
                tags.push(tag_id);
            }
        }
    }

    // Update heading
    $("#search_result_heading_postfix").text(": [" + slideshow_files.length + "/" + files_json['total_num_files'] + "]");

    // Update search matches
    var directories_html = '';
    var persons_html = '';
    var locations_html = '';
    var tags_html = '';

    if (slideshow_files.length > 0) {
        var directories = get_directories_from_files(slideshow_files);
        directories_html += directories.join('<br>');
    }

    if (persons.length > 0) {
        for (var i=0, person_id; person_id = persons[i]; i++) {
            var person = find_person(person_id);
            if (person != null) {
                persons_html += get_person_span(person) + '<br>';
            }
        }
        persons_html = remove_text_ending(persons_html, '<br>');
    }

    if (locations.length > 0) {
        for (var i=0, location_id; location_id = locations[i]; i++) {
            var location = find_location(location_id);
            if (location != null) {
                locations_html += get_location_map_link(location) + '<br>';
            }
        }
        locations_html = remove_text_ending(locations_html, '<br>');
    }

    if (tags.length > 0) {
        for (var i=0, tag_id; tag_id = tags[i]; i++) {
            var tag = find_tag(tag_id);
            if (tag != null) {
                tags_html += tag['name'] + '<br>';
            }
        }
        tags_html = remove_text_ending(tags_html, '<br>');
    }

    $("#search_result_directories").html(directories_html);
    $("#search_result_persons").html(persons_html);
    $("#search_result_locations").html(locations_html);
    $("#search_result_tags").html(tags_html);
    $("#search_result_text").html('');

    show_slideshow();
}

function get_directories_from_files(files_data) {
    var directories = [];
    for (var i=0, file; file = files_data[i]; i++) {
        var path = file['path'];
        var dir = get_directory_from_path(path);
        if (directories.indexOf(dir) == -1) {
            directories.push(dir);
        }
    }
    directories.sort();
    return directories;
}

function remove_text_ending(text, ending) {
    if (text.indexOf(ending, text.length - ending.length) != -1) {
        text = text.slice(0, -ending.length);
    }
    return text;
}

function show_slideshow() {
    if (slideshow_files.length > 0) {
        restart_slideshow();
        update_export_buttons();
    }
    else {
        clear_slideshow();
    }
}

function is_content_type_image(content_type) {
    return content_type.indexOf('image/') == 0;
}

function load_slideshow_file() {
    var file = slideshow_files[slideshow_index];
    var file_url = '/api/filecontent/' + file['id'];

    $('#slideshow_file_header').text(": [" + (slideshow_index + 1) + "/" + slideshow_files.length + "] " + file['path']);

    $('#file_browser_image_div').empty();
    $('#my_fullscreen_browser').empty();
    $('#my_fullscreen_browser_overlay').empty();

    update_image_div_height('#file_browser_image_div');

    // Make a HEAD request to find out file type (it is not known from the URL)
    $.ajax({
        type: "HEAD",
        url: file_url,
        success: function (data, textStatus, xhr) {
            var content_type = xhr.getResponseHeader("content-type") || "";
            if (is_content_type_image(content_type)) {
                // Small image
                var img = $('<img />', {
                    id: 'slideshow_image',
                    src: file_url,
                    alt: file_url,
                    title: 'File id: ' + file['id'],
                    class: 'limited_img'
                });
                img.appendTo($('#file_browser_image_div'));

                // Fullscreen image
                var img = $('<img />', {
                    //id: 'fullscreen_slideshow_image',
                    src: file_url,
                    alt: file_url//,
                    //title: 'File id: ' + file['id']
                });
                img.appendTo($('#my_fullscreen_browser'));
            }
            else {
                // Note: target blank to not clear search result
                var non_image_html = '<a href="' + file_url + '" target="_blank">Open file of type ' + content_type + '</a>';
                $('#file_browser_image_div').html(non_image_html);
                $('#my_fullscreen_browser').html(non_image_html);
            }
            update_image_div_height('#file_browser_image_div');
        },
        error: function () {
            // TODO: show a bootstrap error div and add a link
            var load_error_html = 'Unable to load file, see <a href="/help#troubleshooting">troubleshooting</a>!';
            $('#file_browser_image_div').html(load_error_html);
            $('#my_fullscreen_browser').html(load_error_html);
            update_image_div_height('#file_browser_image_div');
        }
    });
}

function load_slideshow_text() {
    var file = slideshow_files[slideshow_index];
    var file_text = "";
    var overlay_text = "";

    var file_datetime = file['datetime'];
    if (file_datetime != null) {
        var timestamp = get_printable_datetime(file_datetime) + " (" + get_age(file_datetime, new Date()) + " years ago)";
        file_text += timestamp;
        overlay_text += '<p>' + timestamp + '</p>';
    }

    var file_description = file["description"];
    if (file_description != null) {
        if (file_text.length > 0) {
            file_text += ": ";
        }
        file_text += file_description;
        overlay_text += '<p>' + file_description + '</p>';
    }

    if (file_text.length > 0) {
        file_text += "<br>";
    }

    var item_separator = ', ';
    var overlay_item_separator = '<br>';
    var found_location = false;
    var found_person = false;

    var file_location_ids = file['locations'];
    if (file_location_ids.length > 0) {
        overlay_text += '<p><span class="glyphicon glyphicon-globe"></span>';
        for (var i=0, location_id; location_id = file_location_ids[i]; i++) {
            var location = find_location(location_id);
            if (location != null) {
                var location_map_link = get_location_map_link(location);
                file_text += location_map_link + item_separator;
                overlay_text += overlay_item_separator + location_map_link;
                found_location = true;
           }
        }
        file_text = remove_text_ending(file_text, item_separator);
        overlay_text += '</p>';
    }

    var file_person_ids = file['persons'];
    if (file_person_ids.length > 0) {
        if (found_location) {
            file_text += ": ";
        }

        overlay_text += '<p><span class="glyphicon glyphicon-user"></span>';

        var file_datetime_object = new Date(file_datetime);
        for (var i=0, person_id; person_id = file_person_ids[i]; i++) {
            var person = find_person(person_id);
            if (person != null) {
                var person_age_in_file;
                var person_dateofbirth = person['dateofbirth'];
                if (file_datetime != null && person_dateofbirth != null) {
                    person_age_in_file = " (" + get_age(person_dateofbirth, file_datetime_object) + ")";
                }
                else {
                    person_age_in_file = "";
                }
                var person_text = get_person_span(person) + person_age_in_file;
                file_text += person_text + item_separator;
                overlay_text += overlay_item_separator + person_text;
                found_person = true;
            }
        }
        file_text = remove_text_ending(file_text, item_separator);
        overlay_text += '</p>';
    }

    var file_tag_ids = file['tags'];
    if (file_tag_ids.length > 0) {
        if (found_location || found_person) {
            file_text += "<br>";
        }

        overlay_text += '<p><span class="glyphicon glyphicon-tag"></span>';

        file_text += "Tags: ";
        for (var i=0, tag_id; tag_id = file_tag_ids[i]; i++) {
            var tag = find_tag(tag_id);
            if (tag != null) {
                file_text += tag['name'] + item_separator;
                overlay_text += overlay_item_separator + tag['name'];
            }
        }
        file_text = remove_text_ending(file_text, item_separator) + "<br>";
        overlay_text += '</p>';
    }

    if (file['position'] != null) {
        file_text += 'Position: ' + get_position_map_link(file['position']);
        overlay_text += '<p>Position:<br>' + get_position_map_link(file['position'] + "</p>");
    }

    if (pinned_file_ids.includes(file['id'])) {
        overlay_text += '<p><span class="glyphicon glyphicon-pushpin"></span></p>';
    }

    if (slideshow_repeat) {
        overlay_text += '<p><span class="glyphicon glyphicon-repeat"></span></p>';
    }

    if (slideshow_random) {
        overlay_text += '<p><span class="glyphicon glyphicon-random"></span></p>';
    }

    if (slideshow_timer != null) {
        overlay_text += '<p><span class="glyphicon glyphicon-film"></span></p>';
    }

    $("#slideshow_item_text").html(file_text);
    $("#my_fullscreen_browser_overlay").html(overlay_text);
}

function find_person(person_id) {
    var person_index = find_person_index(person_id);
    if (person_index != -1) {
        return persons[person_index];
    }
    return null;
}

function find_person_index(person_id) {
    if (persons != null) {
        for (var i=0, person; person = persons[i]; i++) {
            if (person['id'] == person_id) {
                return i;
            }
        }
    }
    return -1;
}

function find_location(location_id) {
    var location_index = find_location_index(location_id);
    if (location_index != -1) {
        return locations[location_index];
    }
    return null;
}

function find_location_index(location_id) {
    if (locations != null) {
        for (var i=0, location; location = locations[i]; i++) {
            if (location['id'] == location_id) {
                return i;
            }
        }
    }
    return -1;
}

function find_tag(tag_id) {
    var tag_index = find_tag_index(tag_id);
    if (tag_index != -1) {
        return tags[tag_index];
    }
    return null;
}

function find_tag_index(tag_id) {
    if (tags != null) {
        for (var i=0, tag; tag = tags[i]; i++) {
            if (tag['id'] == tag_id) {
                return i;
            }
        }
    }
    return -1;
}

function slideshow_on() {
    if (slideshow_timer == null) {
        $('#slideshow_toggle_button').removeClass('btn-default').addClass('btn-primary');
        slideshow_timer = setTimeout(slideshow_timer_function, slideshow_interval);
    }
}

function slideshow_off() {
    if (slideshow_timer != null) {
        clearTimeout(slideshow_timer);
        slideshow_timer = null;
        $('#slideshow_toggle_button').removeClass('btn-primary').addClass('btn-default');
        load_slideshow_text();
    }
}

function toggle_slideshow() {
    if (slideshow_timer != null) {
        slideshow_off();
    }
    else {
        slideshow_on();
    }
    // Update slideshow indicator
    load_slideshow_text();
}

function toggle_slideshow_repeat() {
    slideshow_repeat = !slideshow_repeat;
    if (slideshow_repeat) {
        $('#slideshow_toggle_repeat_button').removeClass('btn-default').addClass('btn-primary');
    }
    else {
        $('#slideshow_toggle_repeat_button').removeClass('btn-primary').addClass('btn-default');
    }
    update_slideshow_buttons();
}

function toggle_slideshow_random() {
    slideshow_random = !slideshow_random;
    if (slideshow_random) {
        $('#slideshow_toggle_random_button').removeClass('btn-default').addClass('btn-primary');
    }
    else {
        $('#slideshow_toggle_random_button').removeClass('btn-primary').addClass('btn-default');
    }
    update_slideshow_buttons();
}

function slideshow_timer_function () {
    if (slideshow_timer != null) {
        if (!next_slideshow_file()) {
            slideshow_off();
        }
        setTimeout(slideshow_timer_function, slideshow_interval);
    }
}

function restart_slideshow() {
    if (slideshow_files == null || slideshow_files.length == 0) {
        return;
    }

    load_slideshow_index(0);
}

function end_slideshow() {
    if (slideshow_files == null || slideshow_files.length == 0) {
        return;
    }

    load_slideshow_index(slideshow_files.length - 1);
}

function clear_slideshow() {
    slideshow_files = null;
    slideshow_index = -1;
    $("#slideshow_file_header").text("");
    $("#slideshow_item_text").text("No search result available");
    $('#slideshow_image').attr('src', '');
    $('#slideshow_image').attr('alt', '');
    update_slideshow_buttons();
    update_export_buttons();
}

function load_slideshow_index(index) {
    slideshow_index = index;
    update_slideshow_buttons();
    load_slideshow_file();
    load_slideshow_text();
}

function update_slideshow_buttons() {
    var has_slideshow_files = slideshow_files != null && slideshow_files.length > 0;

    $("#slideshow_restart_button").prop('disabled', !(has_slideshow_files && slideshow_index > 0));
    $("#slideshow_prev_file_button").prop('disabled', !(has_slideshow_files && slideshow_index > 0));
    $("#slideshow_next_file_button").prop('disabled', !(slideshow_random || slideshow_repeat || (has_slideshow_files && slideshow_index < slideshow_files.length - 1)));
    $("#slideshow_end_button").prop('disabled', !(has_slideshow_files && slideshow_index < slideshow_files.length - 1));
    $("#slideshow_fullscreen_button").prop('disabled', !has_slideshow_files);

    $("#slideshow_toggle_button").prop('disabled', !has_slideshow_files);
    if (!has_slideshow_files) {
        $('#slideshow_toggle_button').removeClass('btn-primary').addClass('btn-default');
    }

    $("#slideshow_pin_button").prop('disabled', !has_slideshow_files);
    if (has_slideshow_files) {
        var file_id = slideshow_files[slideshow_index]['id'];
        if (pinned_file_ids.includes(file_id)) {
            $('#slideshow_pin_button').removeClass('btn-default').addClass('btn-primary');
        }
        else {
            $('#slideshow_pin_button').removeClass('btn-primary').addClass('btn-default');
        }
    }
    else {
        $('#slideshow_pin_button').removeClass('btn-primary').addClass('btn-default');
    }

    $("#slideshow_prev_directory_button").prop('disabled', get_prev_directory_slideshow_index() == -1);
    $("#slideshow_next_directory_button").prop('disabled', get_next_directory_slideshow_index() == -1);
}

function update_export_buttons() {
    var has_slideshow_files = slideshow_files != null && slideshow_files.length > 0;
    $("#export_file_list").prop('disabled', !has_slideshow_files);
    $("#export_absolute_paths").prop('disabled', !has_slideshow_files);
    $("#export_relative_paths").prop('disabled', !has_slideshow_files);
    $("#export_zip_file").prop('disabled', !has_slideshow_files);
    $("#export_m3u_file").prop('disabled', !has_slideshow_files);
    $("#export_pls_file").prop('disabled', !has_slideshow_files);
    $("#export_google_maps_route").prop('disabled', !has_slideshow_files);
}

function open_fullscreen_slideshow() {
    document.getElementById("my_fullscreen_browser").style.display = "block";
    document.getElementById("my_fullscreen_browser_overlay").style.display = "inline-block";

    // Needed to hide body scrollbar
    $("body").css('overflow', 'hidden');

    open_fullscreen();
}

function close_fullscreen_browser() {
    // Revert hiding body scrollbar
    $("body").css('overflow', 'visible');

    document.getElementById("my_fullscreen_browser").style.display = "none";
    document.getElementById("my_fullscreen_browser_overlay").style.display = "none";

    close_fullscreen();
}

function fullscreen_browser_changed() {
    fullscreen = !fullscreen;

    if (!fullscreen) {
        slideshow_off();
        close_fullscreen_browser();
    }
}

function open_fullscreen() {
    var elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    }
    else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    }
    else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    }
    else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}

function close_fullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
    }
    else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        document.webkitExitFullscreen();
    }
    else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
    }
}

function next_slideshow_file() {
    if (slideshow_files == null || slideshow_files.length == 0) {
        return false;
    }
    
    if (slideshow_random) {
        var random_index;
        do{
            random_index = Math.floor((Math.random() * slideshow_files.length));
        } while (slideshow_index == random_index);
        load_slideshow_index(random_index);
        return true;
    }
    else {
        if (slideshow_index < slideshow_files.length - 1) {
            load_slideshow_index(slideshow_index+1);
            return true;
        }
        else if (slideshow_repeat) {
            load_slideshow_index(0);
            return true;
        }
    }
    return false;
}

function get_directory_from_path(path) {
    var last_slash_index = path.lastIndexOf("/");
    if (last_slash_index == -1) {
        return "";
    }
    return path.substring(0, last_slash_index);
}

function prev_directory_slideshow() {
    var i = get_prev_directory_slideshow_index();
    if (i != -1) {
        load_slideshow_index(i);
    }
}

function get_prev_directory_slideshow_index() {
    if (slideshow_files != null) {
        var current_dir = get_directory_from_path(slideshow_files[slideshow_index]['path']);
        var previous_dir = null;
        for (var i=slideshow_index-1; i>=0; i--) {
            var dir = get_directory_from_path(slideshow_files[i]['path']);
            if (previous_dir == null) {
                if (current_dir != dir) {
                    previous_dir = dir;
                }
            }
            else {
                if (previous_dir != dir) {
                    return i+1;
                }
            }
        }

        if (previous_dir != null) {
            return 0;
        }
    }
    return -1;
}

function next_directory_slideshow() {
    var i = get_next_directory_slideshow_index();
    if (i != -1) {
        load_slideshow_index(i);
    }
}

function get_next_directory_slideshow_index() {
    if (slideshow_files != null) {
        var current_dir = get_directory_from_path(slideshow_files[slideshow_index]['path']);
        for (var i=slideshow_index+1; i<slideshow_files.length; i++) {
            var dir = get_directory_from_path(slideshow_files[i]['path']);
            if (current_dir != dir) {
                return i;
            }
        }
    }
    return -1;
}

function prev_slideshow_file() {
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index > 0) {
        load_slideshow_index(slideshow_index-1);
    }
}

function import_files() {
    if (window.confirm("Adding all files may take several minutes. Continue?")) {
        clear_manage_files_results();
        $("#add_files_status").text("Adding, please wait...");
        $.post("/api/import", function (json) {
            $("#add_files_status").text('Added ' + json['num_added_files'] + ' of ' + (json['num_added_files'] + json['num_not_added_files']) + ' files from the file collection');
        }, "json")
        .fail(function () {
            $("#add_files_status").text("Add all files failed");
        });
    }
}

function clear_manage_files_results() {
    $("#add_files_status").text("");
    $("#delete_files_status").text("");
    $("#rename_files_status").text("");
    $("#consistency_check_status").text("");
    $("#duplicate_files_tool_status").text("");
    // TODO: clean tool tables?
}

function consistency_check() {
    if (window.confirm("File consistency check may take several minutes for all files. Continue?")) {
        clear_manage_files_results();
        $("#consistency_check_status").text("File consistency check running, please wait...");
        $.getJSON("/api/fileconsistency", function (result) {
            var missing_files = result['missing_files'];
            if (missing_files.length == 0) {
                $("#consistency_check_status").text("File consistency check finished successfully");
                clear_consistency_check_files_table();
            }
            else {
                $("#consistency_check_status").text("File consistency check found " + missing_files.length + " missing files:");
                update_consistency_check_files_table(missing_files);
            }
        });
    }
}

function duplicate_files_finder() {
    if (window.confirm("Duplicate files finder may take a while for all files. Continue?")) {
        clear_manage_files_results();
        $("#duplicate_files_tool_status").text("Duplicate files finder running, please wait...");
        $.getJSON("/api/fileduplicates", function (result) {
            var duplicate_files = result['file_duplicates'];
            if (duplicate_files.length == 0) {
                $("#duplicate_files_tool_status").text("No duplicate files found");
                clear_duplicate_files_table();
            }
            else {
                $("#duplicate_files_tool_status").text("Duplicate files finder tool found  " + duplicate_files.length + " files that are duplicated:");
                update_duplicate_files_table(duplicate_files);
            }
        });
    }
}

function prepare_edit_person(id) {
    var person = find_person(id);
    if (person != null) {
        edited_person_id = id;
        $('#person_firstname_input').val(person['firstname']);
        $('#person_lastname_input').val(person['lastname']);
        $('#person_description_input').val(person['description']);
        $('#person_dateofbirth_input').val(person['dateofbirth']);
        $('#tr_person_' + id).attr("class", "success");
    }
}

function clear_edit_person() {
    if (edited_person_id != -1) {
        $('#tr_person_' + edited_person_id).attr("class", "");
        edited_person_id = -1;
    }
    $('#person_firstname_input').val("");
    $('#person_lastname_input').val("");
    $('#person_description_input').val("");
    $('#person_dateofbirth_input').val("");
    $('#person_profilefileid_input').val("");
}

function prepare_edit_location(id) {
    var location = find_location(id);
    if (location != null) {
        edited_location_id = id;
        $('#location_name_input').val(location['name']);
        $('#location_description_input').val(location['description']);
        $('#location_position_input').val(location['position']);
        $('#tr_location_' + id).attr("class", "success");
    }
}

function clear_edit_location() {
    if (edited_location_id != -1) {
        $('#tr_location_' + edited_location_id).attr("class", "");
        edited_location_id = -1;
    }
    $('#location_name_input').val("");
    $('#location_description_input').val("");
    $('#location_position_input').val("");
}

function prepare_edit_tag(id) {
    var tag = find_tag(id);
    if (tag != null) {
        edited_tag_id = id;
        $('#tag_name_input').val(tag['name']);
        $('#tr_tag_' + id).attr("class", "success");
    }
}

function clear_edit_tag() {
    if (edited_tag_id != -1) {
        $('#tr_tag_' + edited_tag_id).attr("class", "");
        edited_tag_id = -1;
    }
    $('#tag_name_input').val("");
}

function delete_file(id) {
    $.ajax({
        url: '/api/file/' + id,
        type: 'DELETE',
        success: function (result) {
            $("#filerow_" + id).remove();
            if ($('#consistency_check_files_table tr').length == 1) {
                clear_consistency_check_files_table();
            }
        }
    })
    .fail(function () {
        alert('Delete file failed');
    });
}

function delete_person(id) {
    if (window.confirm("Deleting a person also removes it from all files. Continue?")) {
        $.ajax({
            url: '/api/person/' + id,
            type: 'DELETE',
            success: function (result) {
                get_persons();
            }
        })
        .fail(function () {
            alert('Delete person failed');
        });
    }
}

function delete_location(id) {
    if (window.confirm("Deleting a location also removes it from all files. Continue?")) {
        $.ajax({
            url: '/api/location/' + id,
            type: 'DELETE',
            success: function (result) {
                get_locations();
            }
        })
        .fail(function () {
            alert('Delete location failed');
        });
    }
}

function delete_tag(id) {
    if (window.confirm("Deleting a tag also removes it from all files. Continue?")) {
        $.ajax({
            url: '/api/tag/' + id,
            type: 'DELETE',
            success: function (result) {
                get_tags();
            }
        })
        .fail(function () {
            alert('Delete tag failed');
        });
    }
}

function get_input(input_id) {
    var value = $('#' + input_id).val();
    if (value == "") {
        return null;
    }
    return value;
}

function modify_person() {
    var jsonData = JSON.stringify(
    {
        "firstname": get_input('person_firstname_input'),
        "lastname": get_input('person_lastname_input'),
        "description": get_input('person_description_input'),
        "dateofbirth": get_input('person_dateofbirth_input'),
        "profilefileid": get_input('person_profilefileid_input')
    });

    var method;
    var url;
    if (edited_person_id == -1) {
        method = 'POST';
        url = '/api/person';
    }
    else {
        method = 'PUT';
        url = '/api/person/' + edited_person_id;
    }

    // Add or update person
    $.ajax
    ({
        type: method,
        url: url,
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function (responseData) {
            clear_edit_person();
            get_persons();
        },
        error: function () {
            alert("Save person failed");
        }
    });
}

function modify_location() {
    var jsonData = JSON.stringify(
    {
        "name": get_input('location_name_input'),
        "description": get_input('location_description_input'),
        "position": get_input('location_position_input')
    });

    var method;
    var url;
    if (edited_location_id == -1) {
        method = 'POST';
        url = '/api/location';
    }
    else {
        method = 'PUT';
        url = '/api/location/' + edited_location_id;
    }

    // Add or update location
    $.ajax
    ({
        type: method,
        url: url,
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function (responseData) {
            clear_edit_location();
            get_locations();
        },
        error: function () {
            alert("Save location failed");
        }
    });
}

function modify_tag() {
    var jsonData = JSON.stringify(
    {
        "name": get_input('tag_name_input')
    });

    var method;
    var url;
    if (edited_tag_id == -1) {
        method = 'POST';
        url = '/api/tag';
    }
    else {
        method = 'PUT';
        url = '/api/tag/' + edited_tag_id;
    }

    // Add or update tag
    $.ajax
    ({
        type: method,
        url: url,
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function (responseData) {
            clear_edit_tag();
            get_tags();
        },
        error: function () {
            alert("Save tag failed");
        }
    });
}

function post_add_directory(path) {
    clear_manage_files_results();
    $("#add_files_status").text("Adding files from directory, please wait...");
    var json = {"path": path};
    $.ajax
    ({
        type: 'POST',
        url: "/api/directory",
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function (result) {
            $("#add_files_status").html("Added " + result['num_added_files'] + " of " + (result['num_added_files'] + result['num_not_added_files']) + " files in specified directory");
        },
        error: function () {
            $("#add_files_status").text("Failed to add files from directory, please try another name.");
        }
    });
}

function delete_delete_directory(path) {
    clear_manage_files_results();
    $("#delete_files_status").text("Deleting files from directory, please wait...");
    var json = {"path": path};
    $.ajax
    ({
        type: 'DELETE',
        url: "/api/directory",
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function (result) {
            $("#delete_files_status").html('Deleted ' + result['num_deleted_files'] + ' files from specified directory');
        },
        error: function () {
            $("#delete_files_status").text("Failed to delete files from directory");
        }
    });
}

function delete_files_from_filelist() {
    var file_list_str = $('#delete_files_from_filelist_input').val().trim();
    var file_ids = parse_file_list_ids(file_list_str);
    if (file_ids.length == 0) {
        alert("Specify a file list");
        return;
    }

    clear_manage_files_results();
    $("#delete_files_status").text("Deleting files, please wait...");

    var jsonData = JSON.stringify({"files": file_ids});

    $.ajax
    ({
        type: 'DELETE',
        url: '/api/files',
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function (result) {
            $("#delete_files_status").html('Deleted ' + result['num_deleted_files'] + ' files');
        },
        error: function () {
            $("#delete_files_status").text("Failed to delete files");
        }
    });
}

function get_printable_datetime(datetime) {
    return datetime.replace('T', ' ');
}

function get_printable_value(value) {
    if (value !== null && value !== "") {
        return value;
    }
    return 'N/A';
}

function get_age(date_start_str, date_end) {
    var birthDate = new Date(date_start_str);
    var age = date_end.getFullYear() - birthDate.getFullYear();
    var m = date_end.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && date_end.getDate() < birthDate.getDate())) {
        age--;
    }
    // This is a fix for if a person is tagged in a file with a date and time before the person was born.
    // This happens especially if a file uses the YYYY date format.
    // In that case 0 looks better than a negative number.
    return Math.max(0, age); 
}

function get_person_span(person) {
    var text = person['firstname'] + ' ' + person['lastname'];
    var description = person['description'];
    if (description != null) {
        return '<span title="' + description + '">' + text + '</span>';
    }
    else {
        return text;
    }
}

function get_location_span(location) {
    var text = location['name'];
    var description = location['description'];
    if (description != null) {
        return '<span title="' + description + '">' + text + '</span>';
    }
    else {
        return text;
    }
}

function get_location_map_link(location) {
    var title = location['description'];
    if (title == null) {
        title = "";
    }
    var position = location['position'];
    if (position != null) {
        var positionParts = position.split(" ");
        if (positionParts.length == 2) {
            var latitude = positionParts[0];
            var longitude = positionParts[1];
            return '<a href="https://www.google.com/maps?q=loc:' + latitude + ',' + longitude + '" target="_blank" title="' + title + '">' + location['name'] + '</a>';
        }
    }
    return '<span title="' + title  +'">' + location['name'] + '</span>';
}

function get_position_map_link(position) {
    if (position != null) {
        var positionParts = position.split(" ");
        if (positionParts.length == 2) {
            var latitude = positionParts[0];
            var longitude = positionParts[1];
            return '<a href="https://www.google.com/maps?q=loc:' + latitude + ',' + longitude + '" target="_blank">' + position + '</a>';
        }
    }
    return "N/A";
}

function show_exported_data(data) {
    $('#exportresult').html('<pre>' + data + '</pre>');
}

function download_exported_data(data) {
    // TODO: how to trigger download dialog?
}

function export_file_list() {
    if (slideshow_files == null || slideshow_files.length == 0) {
        $('#exportresult').html('Nothing to export');
        return;
    }
    var exported_data = "";
    for (var i=0, file; file = slideshow_files[i]; i++) {
        exported_data += file['id'] + ';';
    }
    show_exported_data(exported_data);
}

function export_absolute_paths() {
    export_data('/api/exportabspaths', show_exported_data);
}

function export_relative_paths() {
    export_data('/api/exportpaths', show_exported_data);
}

function export_data(url, success_function) {
    if (slideshow_files == null || slideshow_files.length == 0) {
        $('#exportresult').html('Nothing to export');
        return;
    }

    $('#exportresult').html('');

    var file_ids = [];
    for (var i=0, file; file = slideshow_files[i]; i++) {
        file_ids.push(file['id']);
    }

    var json = {"files": file_ids};

    $.ajax
    ({
        type: 'POST',
        url: url,
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function (data) { success_function (data); },
        error: function (xhr, desc, err) {
            $('#exportresult').html('Export failed: ' + desc);
        }
    });
}

function export_zip_file() {
    export_data('/api/exportzip', download_exported_data);
}

function export_m3u_file() {
    export_data('/api/exportm3u', show_exported_data);
}

function export_pls_file() {
    export_data('/api/exportpls', show_exported_data);
}

function export_google_maps_route() {
    var positions_str = '';
    for (var i=0, file; file = slideshow_files[i]; i++) {
        if (file['position'] != null) {
            positions_str += file['position'].replace(' ', ',') + '/';
        }
    }

    if (positions_str.length > 0) {
        var link = 'https://www.google.com/maps/dir/' + positions_str;
        $('#exportresult').html('<a target="blank" href="' + link + '">' + link +'</a>');
    }
    else {
        $('#exportresult').html('Missing file positions in search result');
    }
}

function get_search_result_file_export_str() {
    var file_ids_str = "";
    if (slideshow_files != null) {
        for (var i=0, file; file = slideshow_files[i]; i++) {
            file_ids_str += file['id'] + ";";
        }
    }
    return file_ids_str;
}

function filelist1_update() {
    var files_str = get_search_result_file_export_str();
    if (files_str == "") {
        $('#filelisttoolsresult').html('No search result available');
    }
    else {
        $('#filelist1_input').val(files_str);
    }
}

function filelist2_update() {
    var files_str = get_search_result_file_export_str();
    if (files_str == "") {
        $('#filelisttoolsresult').html('No search result available');
    }
    else {
        $('#filelist2_input').val(files_str);
    }
}

function filelists_union() {
    show_filelists_result([]);

    var list1 = $('#filelist1_input').val().trim();
    var list2 = $('#filelist2_input').val().trim();

    var list1_ids = list1.split(';');
    var list2_ids = list2.split(';');

    var result_ids = list1_ids;
    for (var i=0; i<list2_ids.length; i++) {
        if (result_ids.indexOf(list2_ids[i]) == -1) {
            result_ids.push(list2_ids[i]);
        }
    }

    show_filelists_result(result_ids);
}

function filelists_intersection() {
    show_filelists_result([]);

    var list1 = $('#filelist1_input').val().trim();
    var list2 = $('#filelist2_input').val().trim();

    var list1_ids = list1.split(';');
    var list2_ids = list2.split(';');

    var result_ids = [];
    for (var i=0; i<list1_ids.length; i++) {
        if (list2_ids.indexOf(list1_ids[i]) != -1) {
            result_ids.push(list1_ids[i]);
        }
    }

    show_filelists_result(result_ids);
}

function filelists_difference() {
    show_filelists_result([]);

    var list1 = $('#filelist1_input').val().trim();
    var list2 = $('#filelist2_input').val().trim();

    var list1_ids = list1.split(';');
    var list2_ids = list2.split(';');

    var result_ids = [];
    for (var i=0; i<list1_ids.length; i++) {
        if (list2_ids.indexOf(list1_ids[i]) == -1) {
            result_ids.push(list1_ids[i]);
        }
    }
    for (var i=0; i<list2_ids.length; i++) {
        if (list1_ids.indexOf(list2_ids[i]) == -1) {
            result_ids.push(list2_ids[i]);
        }
    }

    show_filelists_result(result_ids);
}

function show_filelists_result(file_ids) {
    var files_str = "";
    for (var i=0, file_id; file_id = file_ids[i]; i++) {
        files_str += file_id + ';';
    }
    $('#filelists_result_input').val(files_str);
}

function filelists_copy_result() {
    var filelists_result = document.getElementById("filelists_result_input");
    filelists_result.select();
    document.execCommand("copy");
}
