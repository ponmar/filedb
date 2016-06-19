var persons = null;
var locations = null;
var tags = null;

var categorize_files = null;
var categorize_files_index = -1; // TODO: rename
var categorize_result = null;

var slideshow_files = null;
var slideshow_index = -1;
var slideshow_timer = null;
var slideshow_interval = 3000;

var edited_person_id = -1;
var edited_location_id = -1;
var edited_tag_id = -1;

// TODO: use different init-functions per page instead of checking if ids exist
$(document).ready(function(){
    if (needs_persons()){
        get_persons();
    }

    if (needs_locations()){
        get_locations();
    }

    if (needs_tags()){
        get_tags();
    }

    if (needs_files()){
        get_files();
    }

    if ($('#add_person_form').length){
        $("#add_person_form").submit(function(evt){
            evt.preventDefault();
            modify_person();
        });
    }

    if ($('#add_location_form').length){
        $("#add_location_form").submit(function(evt){
            evt.preventDefault();
            modify_location();
        });
    }

    if ($('#add_tag_form').length){
        $("#add_tag_form").submit(function(evt){
            evt.preventDefault();
            modify_tag();
        });
    }

    if ($('#add_directory_form').length){
        $("#add_directory_form").submit(function(evt){
            evt.preventDefault();
            post_add_directory_form();
        });
    }

    if ($('#add_file_form').length){
        $("#add_file_form").submit(function(evt){
            evt.preventDefault();
            post_add_file_form();
        });
    }

    if ($('#search_files_by_category_button').length){
        $("#search_files_by_category_button").click(function(){
            search_files();
        });
    }

    if ($('#slideshow_restart_button').length){
        $('#slideshow_restart_button').click(function(){
            restart_slideshow();
        });
    }

    if ($('#slideshow_prev_file_button').length){
        $('#slideshow_prev_file_button').click(function(){
            prev_slideshow_file();
        });
    }

    if ($('#slideshow_next_file_button').length){
        $('#slideshow_next_file_button').click(function(){
            next_slideshow_file();
        });
    }

    if ($('#slideshow_random_file_button').length){
        $('#slideshow_random_file_button').click(function(){
            random_slideshow_file();
        });
    }

    if ($('#slideshow_toggle_button').length){
        $("#slideshow_toggle_button").click(function(){
            toggle_slideshow();
        });
    }

    if ($('#button_show_all_files').length){
        $("#button_show_all_files").click(function(){
            update_list_of_files();
        });
    }

    if ($('#import_button').length){
        $("#import_button").click(function(){
            import_files();
        });
    }

    if ($('#consistency_check_button').length){
        $("#consistency_check_button").click(function(){
            consistency_check();
        });
    }

    if ($('#find_file_wo_any_button').length){
        $('#find_file_wo_any_button').click(function(){
            categorize_file_without_any();
        });
    }

    if ($('#find_file_wo_person_button').length){
        $('#find_file_wo_person_button').click(function(){
            categorize_file_without_person();
        });
    }

    if ($('#find_file_wo_location_button').length){
        $('#find_file_wo_location_button').click(function(){
            categorize_file_without_location();
        });
    }

    if ($('#find_file_wo_tag_button').length){
        $('#find_file_wo_tag_button').click(function(){
            categorize_file_without_tag();
        });
    }

    if ($('#find_file_wo_description_button').length){
        $('#find_file_wo_description_button').click(function(){
            categorize_file_without_description();
        });
    }

    if ($('#find_file_wo_date_button').length){
        $('#find_file_wo_date_button').click(function(){
            categorize_file_without_date();
        });
    }

    if ($('#find_file_by_path_button').length){
        $('#find_file_by_path_button').click(function(){
            categorize_file_from_path();
        })
    }

    if ($('#find_file_by_path_regexp_button').length){
        $('#find_file_by_path_regexp_button').click(function(){
            categorize_file_from_path_regexp();
        })
    }

    if ($('#prev_file_categorize_button').length){
        $('#prev_file_categorize_button').click(function(){
            prev_categorize_file();
        })
    }

    if ($('#next_file_categorize_button').length){
        $('#next_file_categorize_button').click(function(){
            next_categorize_file();
        })
    }

    if ($('#save_file_categorize_button').length){
        $('#save_file_categorize_button').click(function(){
            save_file_categorization();
        })
    }

    // TODO: only register on browse page
    // Register slideshow control keys
    $(document).keypress(function(e){
        if (e.which == 97){
            // 'a' pressed
            prev_slideshow_file();
        }
        else if (e.which == 100){
            // 'd' pressed
            next_slideshow_file();
        }
        else if (e.which == 114){
            // 'r' pressed
            random_slideshow_file();
        }
    });
});

function needs_persons(){
    return $('#personbuttons').length || $('#personstable').length || $('#person_categories').length;
}

function needs_locations(){
    return $('#locationbuttons').length || $('#locationstable').length || $('#location_categories').length;
}

function needs_tags(){
    return $('#tagbuttons').length || $('#tagstable').length || $('#tag_categories').length;
}

function needs_files(){
    return $('#categorize_image_div').length;
}

function get_persons(){
    $.getJSON("/api/persons", function(result){
        persons = result['persons'];

        if ($('#personbuttons').length){
            $('#personbuttons').text("");
            for (var i=0, person; person = persons[i]; i++){
                $("#personbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + get_person_span(person) + '</label><br>');
            }
        }

        if ($('#personstable').length){
            $('#personstable tbody tr:not(:first)').remove();

            if (persons.length > 0){
                $("#no_person_message").hide();

                var now = new Date();

                for (var i=0, person; person = persons[i]; i++){
                    var dateofbirth = person['dateofbirth'];
                    var age = null;
                    if (dateofbirth != null){
                        age = get_age(dateofbirth, now);
                    }
                    $("#personstable").append('<tr id="tr_person_' + person['id'] + '"><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td><a href="" class="edit_person_button" id="edit_person_' + person['id'] + '">Edit</a>, <a href="" class="delete_person_button" id="delete_person_' + person['id'] + '">Delete</a></td></tr>');
                }

                $(".edit_person_button").click(function(evt){
                    var id = $(this).attr('id').replace('edit_person_', '');
                    if (id == edited_person_id){
                        clear_edit_person();
                    }
                    else if (edited_person_id == -1){
                        prepare_edit_person(id);
                    }
                    return false; // do not follow link
                });

                $(".delete_person_button").click(function(evt){
                    var id = $(this).attr('id').replace('delete_person_', '');
                    delete_person(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_person_message").show();
            }
        }

        if ($('#person_categories').length){
            var labels = '';
            for (var i=0, person; person = persons[i]; i++){
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + get_person_span(person) + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $('#person_categories').html(labels);
        }
    });
}

function get_locations(){
    $.getJSON("/api/locations", function(result){
        locations = result['locations'];

        if ($('#locationbuttons').length){
            $('#locationbuttons').text("");
            for (var i=0, location; location = locations[i]; i++){
                $("#locationbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + get_location_span(location) + '</label><br>');
            }
        }

        if ($('#locationstable').length){
            $('#locationstable tbody tr:not(:first)').remove();

            if (locations.length > 0){
                $("#no_location_message").hide();

                for (var i=0, location; location = locations[i]; i++){
                    $("#locationstable").append('<tr id="tr_location_' + location['id'] + '"><td>' + location['name'] + '</td><td>' + get_printable_value(location['description']) + '</td><td>' + get_position_map_link(location) + '</td><td><a href="" class="edit_location_button" id="edit_location_' + location['id'] + '">Edit</a>, <a href="" class="delete_location_button" id="delete_location_' + location['id'] + '">Delete</a></td></tr>');
                }

                $(".edit_location_button").click(function(){
                    var id = $(this).attr('id').replace('edit_location_', '');
                    if (id == edited_location_id){
                        clear_edit_location();
                    }
                    else if (edited_location_id == -1){
                        prepare_edit_location(id);
                    }
                    return false; // do not follow link
                });

                $(".delete_location_button").click(function(){
                    var id = $(this).attr('id').replace('delete_location_', '');
                    delete_location(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_location_message").show();
            }
        }

        if ($('#location_categories').length){
            var labels = '';
            for (var i=0, location; location = locations[i]; i++){
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + get_location_span(location) + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $('#location_categories').html(labels);
        }
    });
}

function get_tags(){
    $.getJSON("/api/tags", function(result){
        tags = result['tags'];

        if ($('#tagbuttons').length){
            $('#tagbuttons').text("");
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label><br>');
            }
        }

        if ($('#tagstable').length){
            $('#tagstable tbody tr:not(:first)').remove();

            if (tags.length > 0){
                $("#no_tag_message").hide();

                for (var i=0, tag; tag = tags[i]; i++){
                    $("#tagstable").append('<tr id="tr_tag_' + tag['id'] + '"><td>' + tag['name'] + '</td><td><a href="" class="edit_tag_button" id="edit_tag_' + tag['id'] + '">Edit</a>, <a href="" class="delete_tag_button" id="delete_tag_' + tag['id'] + '">Delete</a></td></tr>');
                }

                $(".edit_tag_button").click(function(){
                    var id = $(this).attr('id').replace('edit_tag_', '');
                    if (id == edited_tag_id){
                        clear_edit_tag();
                    }
                    else if (edited_tag_id == -1){
                        prepare_edit_tag(id);
                    }
                    return false; // do not follow link
                });

                $(".delete_tag_button").click(function(){
                    var id = $(this).attr('id').replace('delete_tag_', '');
                    delete_tag(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_tag_message").show();
            }
        }

        if ($('#tag_categories').length){
            var labels = '';
            $('#tag_categories').empty();
            for (var i=0, tag; tag = tags[i]; i++){
                labels += '<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label><br>';
            }
            labels = remove_text_ending(labels, '<br>');
            $("#tag_categories").html(labels);
        }
    });
}

function get_files(){
    $.getJSON("/api/files", function(result){
        if ($('#categorize_image_div').length){
            categorize_files = result['files'];
        }
    });
}

function update_list_of_files(){
    $("#get_all_files_status").text("Loading files...");
    $.getJSON("/api/files", function(result){
        $("#filestable").empty();
        $("#filestable").append('<tr><th>File</th><th>Description</th><th>Age</th><th>Date and Time</th><th>Persons</th><th>Locations</th><th>Tags</th><th>Actions</th></tr>');
        var now = new Date();
        var files = result['files'];
        for (var i=0, file; file = files[i]; i++){
            var datetime = file['datetime'];
            var age = null;
            if (datetime != null){
                age = get_age(datetime, now);
            }
            var numPersons = file['persons'].length;
            var numLocations = file['locations'].length;
            var numTags = file['tags'].length;
            var fileId = file['id'];
            // TODO: optimize: create one long string and then set it with one call to not change the DOM many times
            $("#filestable").append('<tr id="filerow_' + fileId + '"><td><a href="/api/filecontent/' + fileId + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + numPersons + '</td><td>' + numLocations + '</td><td>' + numTags + '</td><td><a href="" class="delete_file_button" id="delete_file_' + fileId + '">Delete</a>, <a href="/api/fileexif/' + fileId + '">Exif</a></td></tr>');
        }

        $(".delete_file_button").click(function(){
            var id = $(this).attr('id').replace('delete_file_', '');
            delete_file(id);
            return false; // do not follow link
        });
    })
    .always(function(){
        $("#get_all_files_status").text("");
    });
}

function prev_categorize_file(){
    if (categorize_files_index > 0){
        categorize_files_index--;
        categorize_file();
    }
}

function next_categorize_file(){
    if (categorize_files_index != -1 && categorize_files_index < categorize_result.length - 1){
        categorize_files_index++;
        categorize_file();
    }
}

function categorize_file(){
    var file = categorize_files[categorize_result[categorize_files_index]];
    var file_description = file['description'];
    var file_date = file['datetime'];
    var file_url = '/api/filecontent/' + file['id'];

    $('#categorize_file_path').text("[" + (categorize_files_index+1) + "/" + categorize_result.length + "] " + file['path']);

    if (file_description != null){
        $('#file_description').val(file_description);
    }
    else{
        $('#file_description').val("");
    }

    if (file_date != null){
        $('#file_date').val(file_date);
    }
    else{
        $('#file_date').val("");
    }

    for (var i=0, person; person = persons[i]; i++){
        var file_has_person = file['persons'].indexOf(person['id']) != -1;
        $('#person_' + person['id']).prop('checked', file_has_person);
    }

    for (var i=0, location; location = locations[i]; i++){
        var file_has_location = file['locations'].indexOf(location['id']) != -1;
        $('#location_' + location['id']).prop('checked', file_has_location);
    }

    for (var i=0, tag; tag = tags[i]; i++){
        var file_has_tag = file['tags'].indexOf(tag['id']) != -1;
        $('#tag_' + tag['id']).prop('checked', file_has_tag);
    }

    $("#save_categorization_status").text("");

    // TODO: create link to file (and remove previous img if any) if selected file is not an image
    if ($('#categorize_image').length){
        $('#categorize_image').attr('src', file_url);
        $('#categorize_image').attr('alt', file_url);
    }
    else{
        $('#categorize_image_div').empty();
        var img = $('<img />', {
            id: 'categorize_image',
            src: file_url,
            alt: file_url,
            class: 'limited_img'
        });
        img.appendTo($('#categorize_image_div'));
    }
    update_image_div_height('#categorize_image_div');
}

function update_image_div_height(selector){
    set_div_height(selector, 0.75);
}

function set_div_height(selector, factor){
    var height = $(selector).width() * factor;
    $(selector).css({'height': height + 'px'});
}

// TODO: use only one function with arguments for finding file to categorize?
function categorize_file_without_any(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['persons'].length == 0 && file['locations'].length == 0 && file['tags'].length == 0 && file['description'] == null){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_without_person(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['persons'].length == 0){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_without_location(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['locations'].length == 0){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_without_tag(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['tags'].length == 0){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_without_description(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['description'] == null){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_without_date(){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (file['datetime'] == null){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function categorize_file_from_path(){
    if (categorize_files != null){
        var path = $('#find_file_by_path_input').val();
        if (path != null && path != ""){
            categorize_result = [];
            for (var file, i=0; file = categorize_files[i]; i++){
                if (file['path'].startsWith(path)){
                    categorize_result.push(i);
                }
            }
            update_categorize_result();
        }
    }
}

function categorize_file_from_path_regexp(){
    if (categorize_files != null){
        var pattern = $('#find_file_by_path_regexp_input').val();
        if (pattern != null && pattern != ""){
            var regexp = new RegExp(pattern);
            categorize_result = [];
            for (var file, i=0; file = categorize_files[i]; i++){
                if (regexp.test(file['path'])){
                    categorize_result.push(i);
                }
            }
            update_categorize_result();
        }
    }
}

function update_categorize_result(){
    if (categorize_result.length > 0){
        categorize_files_index = 0;
        categorize_file();
    }
    else{
        // TODO: also clear checkboxes for persons, locations and tags
        $('#categorize_file_path').text("N/A");
        $('#file_description').val("");
        $('#file_date').val("");
        if ($('#categorize_image').length){
            $('#categorize_image').attr('src', '');
            $('#categorize_image').attr('alt', '');
        }
    }
}

function save_file_categorization(){
    if (categorize_files_index != -1){

        var selected_persons = [];
        for (var i=0, person; person = persons[i]; i++){
            var id = "person_" + person['id'];
            var checkbox = document.getElementById(id);
            if (checkbox != null && checkbox.checked){
                selected_persons.push(person['id']);
            }
        }

        var selected_locations = [];
        for (var i=0, location; location = locations[i]; i++){
            var id = "location_" + location['id'];
            var checkbox = document.getElementById(id);
            if (checkbox != null && checkbox.checked){
                selected_locations.push(location['id']);
            }
        }

        var selected_tags = [];
        for (var i=0, tag; tag = tags[i]; i++){
            var id = "tag_" + tag['id'];
            var checkbox = document.getElementById(id);
            if (checkbox != null && checkbox.checked){
                selected_tags.push(tag['id']);
            }
        }

        var description = $('#file_description').val();
        if (description == ""){
            description = null;
        }

        var datetime = $('#file_date').val();
        if (datetime == ""){
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

        $("#save_categorization_status").text("Saving...");
        $.ajax
        ({
            type: "PUT",
            url: '/api/file/' + categorize_files[categorize_result[categorize_files_index]]['id'],
            contentType : 'application/json',
            data: jsonData,
            success: function(){
                $("#save_categorization_status").text("Saved successfully");
            },
            error: function(){
                $("#save_categorization_status").text("An error occured");
            }
        })
    }
    else{
        alert('Please find a file to categorize');
    }
}

function create_files_url(){
    var checked_persons = '';
    for (var i=0, person; person = persons[i]; i++){
        var id = 'person_' + person['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked){
            checked_persons += person['id'] + ',';
        }
    }
    if (checked_persons != ""){
        checked_persons = checked_persons.slice(0, -1);
    }

    var checked_tags = '';
    for (var i=0, tag; tag = tags[i]; i++){
        var id = 'tag_' + tag['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked) {
            checked_tags += tag['id'] + ',';
        }
    }
    if (checked_tags != ""){
        checked_tags = checked_tags.slice(0, -1);
    }

    var checked_locations = '';
    for (var i=0, location; location = locations[i]; i++){
        var id = 'location_' + location['id'];
        var checkbox = document.getElementById(id);
        if (checkbox != null && checkbox.checked) {
            checked_locations += location['id'] + ',';
        }
    }
    if (checked_locations != ""){
        checked_locations = checked_locations.slice(0, -1);
    }

    return '/api/files?personids=' + checked_persons + '&locationids=' + checked_locations + '&tagids=' + checked_tags;
}

function search_files(){
    var url = create_files_url();
    $.getJSON(url, function(result){
        update_search_result(result);
        show_slideshow();
    });
}

function update_search_result(files_json){
    slideshow_files = files_json['files'];

    // TODO: change data-structures for storing unique values?
    var persons = {};
    var locations = {};
    var tags = {};

    // Store unique persons, locations and tags from search result
    for (var i=0, file; file = slideshow_files[i]; i++){
        for (var j=0, person_id; person_id = file['persons'][j]; j++){
            persons[person_id] = person_id;
        }
        for (var j=0, person_id; person_id = file['locations'][j]; j++){
            locations[person_id] = person_id;
        }
        for (var j=0, person_id; person_id = file['tags'][j]; j++){
            tags[person_id] = person_id;
        }
    }

    // Create result message

    var item_separator = ', ';

    var text = slideshow_files.length + " file matches with categories: ";

    if (Object.keys(persons).length > 0 || Object.keys(locations).length > 0 || Object.keys(tags).length > 0){
        for (var person_id in persons){
            var person = find_person(person_id);
            if (person != null){
                text += get_person_span(person) + item_separator;
            }
        }

        for (var location_id in locations){
            var location = find_location(location_id);
            if (location != null){
                text += get_location_map_link(location) + item_separator;
            }
        }

        for (var tag_id in tags){
            var tag = find_tag(tag_id);
            if (tag != null){
                text += tag['name'] + item_separator;
            }
        }

        text = remove_text_ending(text, item_separator);
    }
    else{
        text += "N/A";
    }

    $("#search_result_text").html(text);
}

function remove_text_ending(text, ending){
    if (text.endsWith(ending)){
        text = text.slice(0, -ending.length);
    }
    return text;
}

function show_slideshow(){
    if (slideshow_files.length > 0){
        restart_slideshow();
    }
    else{
        clear_slideshow();
    }
}

function load_slideshow_file(){
    var file = slideshow_files[slideshow_index];
    var file_url = '/api/filecontent/' + file['id'];

    $('#slideshow_file_path').text("[" + (slideshow_index + 1) + "/" + slideshow_files.length + "] " + file['path']);

    // TODO: create link to file (and remove previous img if any) if selected file is not an image
    if ($('#slideshow_image').length){
        $('#slideshow_image').attr('src', file_url);
    }
    else{
        var img = $('<img />', {
            id: 'slideshow_image',
            src: file_url,
            alt: file_url,
            class: 'limited_img'
        });
        img.appendTo($('#file_browser_image_div'));
    }
    update_image_div_height('#file_browser_image_div');

    var file_text = "";

    var file_datetime = file['datetime'];
    if (file_datetime != null){
        file_text += file_datetime + " (" + get_age(file_datetime, new Date()) + " years ago)";
    }

    var file_description = file["description"];
    if (file_description != null){
        if (file_text.length > 0){
            file_text += ": ";
        }
        file_text += file_description;
    }

    if (file_text.length > 0){
        file_text += "<br>";
    }

    var item_separator = ', ';
    var found_location = false;
    var found_person = false;

    var file_location_ids = file['locations'];
    if (file_location_ids.length > 0){
        for (var i=0, location_id; location_id = file_location_ids[i]; i++){
            var location = find_location(location_id);
            if (location != null){
                file_text += get_location_map_link(location) + item_separator;
                found_location = true;
           }
        }
        file_text = remove_text_ending(file_text, item_separator);
    }

    var file_person_ids = file['persons'];
    if (file_person_ids.length > 0){
        if (found_location){
            file_text += ": ";
        }

        var file_datetime_object = new Date(file_datetime);
        for (var i=0, person_id; person_id = file_person_ids[i]; i++){
            var person = find_person(person_id);
            if (person != null){
                var person_age_in_file;
                var peson_dateofbirth = person['dateofbirth'];
                if (file_datetime != null && peson_dateofbirth != null){
                    person_age_in_file = " (" + get_age(peson_dateofbirth, file_datetime_object) + ")";
                }
                else{
                    person_age_in_file = "";
                }
                file_text += get_person_span(person) + person_age_in_file + item_separator;
                found_person = true;
            }
        }
        file_text = remove_text_ending(file_text, item_separator);
    }

    var file_tag_ids = file['tags'];
    if (file_tag_ids.length > 0){
        if (found_location || found_person){
            file_text += "<br>";
        }

        file_text += "Tags: ";
        for (var i=0, tag_id; tag_id = file_tag_ids[i]; i++){
            var tag = find_tag(tag_id);
            if (tag != null){
                file_text += tag['name'] + item_separator;
            }
        }
        file_text = remove_text_ending(file_text, item_separator) + "<br>";
    }

    $("#slideshow_item_text").html(file_text);
}

// TODO: change JSON data structure from array to hashmap to avoid this scanning?
function find_person(person_id){
    if (persons != null){
        for (var i=0, person; person = persons[i]; i++){
            if (person['id'] == person_id){
                return person;
            }
        }
    }
    return null;
}

// TODO: change JSON data structure from array to hashmap to avoid this scanning?
function find_location(location_id){
    if (locations != null){
        for (var i=0, location; location = locations[i]; i++){
            if (location['id'] == location_id){
                return location;
            }
        }
    }
    return null;
}

// TODO: change JSON data structure from array to hashmap to avoid this scanning?
function find_tag(tag_id){
    if (tags != null){
        for (var i=0, tag; tag = tags[i]; i++){
            if (tag['id'] == tag_id){
                return tag;
            }
        }
    }
    return null;
}

function toggle_slideshow(){
    if (slideshow_timer != null){
        clearTimeout(slideshow_timer);
        slideshow_timer = null;
        $("#slideshow_toggle_button").html('Slideshow: Off');
    }
    else{
        $("#slideshow_toggle_button").html('Slideshow: On');
        slideshow_timer = setTimeout(slideshow_timer_function, slideshow_interval);
    }
}

function slideshow_timer_function(){
    if (slideshow_timer != null){
        if (!next_slideshow_file()){
            toggle_slideshow();
        }
        setTimeout(slideshow_timer_function, slideshow_interval);
    }
}

function restart_slideshow(){
    slideshow_index = 0;
    load_slideshow_file();
}

function clear_slideshow(){
    slideshow_files = null;
    slideshow_index = -1;
    $("#slideshow_file_path").text("N/A");
    $("#slideshow_item_text").text("No search result available");
    $('#slideshow_image').attr('src', '');
    $('#slideshow_image').attr('alt', '');
}

function next_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index < slideshow_files.length - 1){
        slideshow_index++;
        load_slideshow_file();
        return true;
    }
    return false;
}

function prev_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index > 0){
        slideshow_index--;
        load_slideshow_file();
    }
}

function random_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 1){
        var random_index;
        do{
            random_index = Math.floor((Math.random() * slideshow_files.length));
        }
        while (slideshow_index == random_index);
        slideshow_index = random_index;
        load_slideshow_file();
    }
}

function import_files(){
    if (window.confirm("Importing all files may take several minutes. Continue?")){
        clear_add_files_results();
        $("#import_status").text("Importing, please wait...");
        $.post("/api/import", function(json) {
            $("#import_status").text('Imported ' + json['num_added_files'] + ' of ' + (json['num_added_files'] + json['num_not_added_files']) + ' files from the file collection');
        }, "json")
        .fail(function(){
            $("#import_status").text("Import failed");
        });
    }
}

function clear_add_files_results(){
    $("#import_status").text("");
    $("#add_files_status").text("");
    $("#files_consistency_status").text("");
}

function consistency_check(){
    if (window.confirm("File consistency check for all file entries may take several minutes. Continue?")){
        clear_add_files_results();
        $("#files_consistency_status").text("Running, please wait...");
        $.getJSON("/api/fileconsistency", function(result){
            missing_files = result['missing_files'];
            if (missing_files.length == 0){
                $("#files_consistency_status").text("File consistency check finished successfully");
            }
            else{
                var result = "Identifiers for missing files:";
                for (var i=0, missing_file; missing_file = missing_files[i]; i++){
                    result += "<br>" + missing_file;
                }
                $("#files_consistency_status").html(result);
            }
        });
    }
}

function prepare_edit_person(id){
    var person = find_person(id);
    if (person != null){
        edited_person_id = id;
        $('#person_firstname_input').val(person['firstname']);
        $('#person_lastname_input').val(person['lastname']);
        $('#person_description_input').val(person['description']);
        $('#person_dateofbirth_input').val(person['dateofbirth']);
        $('#tr_person_' + id).attr("class", "success");
    }
}

function clear_edit_person(){
    if (edited_person_id != -1){
        $('#tr_person_' + edited_person_id).attr("class", "");
        edited_person_id = -1;
    }
    $('#person_firstname_input').val("");
    $('#person_lastname_input').val("");
    $('#person_description_input').val("");
    $('#person_dateofbirth_input').val("");
}

function prepare_edit_location(id){
    var location = find_location(id);
    if (location != null){
        edited_location_id = id;
        $('#location_name_input').val(location['name']);
        $('#location_description_input').val(location['description']);
        $('#location_position_input').val(location['position']);
        $('#tr_location_' + id).attr("class", "success");
    }
}

function clear_edit_location(){
    if (edited_location_id != -1){
        $('#tr_location_' + edited_location_id).attr("class", "");
        edited_location_id = -1;
    }
    $('#location_name_input').val("");
    $('#location_description_input').val("");
    $('#location_position_input').val("");
}

function prepare_edit_tag(id){
    tag = find_tag(id);
    if (tag != null){
        edited_tag_id = id;
        $('#tag_name_input').val(tag['name']);
        $('#tr_tag_' + id).attr("class", "success");
    }
}

function clear_edit_tag(){
    if (edited_tag_id != -1){
        $('#tr_tag_' + edited_tag_id).attr("class", "");
        edited_tag_id = -1;
    }
    $('#tag_name_input').val("");
}

function delete_file(id){
    $.ajax({
        url: '/api/file/' + id,
        type: 'DELETE',
        success: function(result){
            $("#filerow_" + id).remove();
        }
    })
    .fail(function(){
        alert('Delete file failed');
    });
}

function delete_person(id){
    if (window.confirm("Are you sure?")){
        $.ajax({
            url: '/api/person/' + id,
            type: 'DELETE',
            success: function(result){
                get_persons();
            }
        })
        .fail(function(){
            alert('Delete person failed');
        });
    }
}

function delete_location(id){
    if (window.confirm("Are you sure?")){
        $.ajax({
            url: '/api/location/' + id,
            type: 'DELETE',
            success: function(result){
                get_locations();
            }
        })
        .fail(function(){
            alert('Delete location failed');
        });
    }
}

function delete_tag(id){
    if (window.confirm("Are you sure?")){
        $.ajax({
            url: '/api/tag/' + id,
            type: 'DELETE',
            success: function(result){
                get_tags();
            }
        })
        .fail(function(){
            alert('Delete tag failed');
        });
    }
}

function get_input(input_id){
    var value = $('#' + input_id).val();
    if (value == ""){
        return null;
    }
    return value;
}

function modify_person(){
    var jsonData = JSON.stringify(
    {
        "firstname": get_input('person_firstname_input'),
        "lastname": get_input('person_lastname_input'),
        "description": get_input('person_description_input'),
        "dateofbirth": get_input('person_dateofbirth_input')
    });

    var method;
    var url;
    if (edited_person_id == -1){
        method = 'POST';
        url = '/api/person';
    }
    else{
        method = 'PUT';
        url = '/api/person/' + edited_person_id;
    }

    // Add or update person
    $.ajax
    ({
        type: method,
        url: url,
        contentType : 'application/json',
        data: jsonData,
        success: function(){
            clear_edit_person();
            get_persons();
        },
        error: function(){
            alert("Save person failed");
        }
    });
}

function modify_location(){
    var jsonData = JSON.stringify(
    {
        "name": get_input('location_name_input'),
        "description": get_input('location_description_input'),
        "position": get_input('location_position_input')
    });

    var method;
    var url;
    if (edited_location_id == -1){
        method = 'POST';
        url = '/api/location';
    }
    else{
        method = 'PUT';
        url = '/api/location/' + edited_location_id;
    }

    // Add or update location
    $.ajax
    ({
        type: method,
        url: url,
        contentType : 'application/json',
        data: jsonData,
        success: function(){
            clear_edit_location();
            get_locations();
        },
        error: function(){
            alert("Save location failed");
        }
    });
}

function modify_tag(){
    var jsonData = JSON.stringify(
    {
        "name": get_input('tag_name_input')
    });

    var method;
    var url;
    if (edited_tag_id == -1){
        method = 'POST';
        url = '/api/tag';
    }
    else{
        method = 'PUT';
        url = '/api/tag/' + edited_tag_id;
    }

    // Add or update location
    $.ajax
    ({
        type: method,
        url: url,
        contentType : 'application/json',
        data: jsonData,
        success: function(){
            clear_edit_tag();
            get_tags();
        },
        error: function(){
            alert("Save location failed");
        }
    });
}

// TODO: replace with json?
function post_add_directory_form(){
    clear_add_files_results();
    $("#add_files_status").text("Adding files from directory, please wait...");
    $.post("/api/directory", $("#add_directory_form").serialize(), function(json){
        $("#add_files_status").html("Added " + json['num_added_files'] + " of " + (json['num_added_files'] + json['num_not_added_files']) + " files in specified directory");
        // TODO: get files for list?
    }, "json")
    .fail(function(){
        $("#add_files_status").text("Failed to add files from directory, please try another name.");
    });
}

// TODO: replace with json?
function post_add_file_form(){
    clear_add_files_results();
    $("#add_files_status").text("Adding file, please wait...");
    $.post("/api/file", $("#add_file_form").serialize(), function(json){
        $("#add_files_status").text("File added successfully");
        // TODO: get files for list?
    }, "json")
    .fail(function(){
        $("#add_files_status").text("Failed to add file, please try another name");
    });
}

function get_printable_value(value){
    if (value !== null && value !== ""){
        return value;
    }
    return 'N/A';
}

function get_age(date_of_birth_str, at_date){
    var birthDate = new Date(date_of_birth_str);
    var age = at_date.getFullYear() - birthDate.getFullYear();
    var m = at_date.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && at_date.getDate() < birthDate.getDate())){
        age--;
    }
    return age;
}

function get_person_span(person){
    var text = person['firstname'] + ' ' + person['lastname'];
    var description = person['description'];
    if (description != null){
        return '<span title="' + description + '">' + text + '</span>';
    }
    else {
        return text;
    }
}

function get_location_span(location){
    var text = location['name'];
    var description = location['description'];
    if (description != null){
        return '<span title="' + description + '">' + text + '</span>';
    }
    else {
        return text;
    }
}

function get_location_map_link(location){
    var title = location['description'];
    if (title == null){
        title = "";
    }
    var position = location['position'];
    if (position != null){
        var positionParts = position.split(" ");
        if (positionParts.length == 2){
            var latitude = positionParts[0];
            var longitude = positionParts[1];
            var zoom = 17;
            return '<a href="https://www.google.com/maps/preview/@' + latitude + ',' + longitude + ',' + zoom + 'z" target="_blank" title="' + title + '">' + location['name'] + '</a>';
        }
    }
    return '<span title="' + title  +'">' + location['name'] + '</span>';
}

function get_position_map_link(location){
    var position = location['position'];
    if (position != null){
        var positionParts = position.split(" ");
        if (positionParts.length == 2){
            var latitude = positionParts[0];
            var longitude = positionParts[1];
            var zoom = 17;
            return '<a href="https://www.google.com/maps/preview/@' + latitude + ',' + longitude + ',' + zoom + 'z" target="_blank">' + position + '</a>';
        }
    }
    return "N/A";
}
