var persons = null;
var locations = null;
var tags = null;

var categorize_files = null;
var categorize_files_index = -1;

var slideshow_files = null;
var slideshow_index = -1;

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
            post_add_person_form();
        });
    }

    if ($('#add_location_form').length){
        $("#add_location_form").submit(function(evt){
            evt.preventDefault();
            post_add_location_form();
        });
    }

    if ($('#add_tag_form').length){
        $("#add_tag_form").submit(function(evt){
            evt.preventDefault();
            post_add_tag_form();
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

    if ($('#search_files_by_file_filter_button').length){
        $('#search_files_by_file_filter_button').click(function(){
            alert('TODO');
        })
    }

    if ($('#search_files_by_category_button').length){
        $("#search_files_by_category_button").click(function(){
            search_files();
        });
    }

    /*
    if ($('#start_slideshow_button').length){
        $("#start_slideshow_button").click(function(){
            prepare_slideshow();
        });
    }
    */

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

    if ($('#button_show_all_files').length){
        $("#button_show_all_files").click(function(){
            get_all_files();
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

    if ($('#save_file_categorize_button').length){
        $('#save_file_categorize_button').click(function(){
            save_file_categorization();
        })
    }

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
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                $("#personbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + name + '</label>');
            }
        }

        if ($('#personstable').length){
            $('#personstable tbody tr:not(:first)').remove();

            if (persons.length > 0){
                $("#no_person_message").hide();
                //$("#personstable").show();

                for (var i=0, person; person = persons[i]; i++){
                    var dateofbirth = person['dateofbirth'];
                    var age = null;
                    if (dateofbirth != null){
                        age = get_age(dateofbirth);
                    }
                    $("#personstable").append('<tr><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td>' + get_person_page_link(person['id'], 'Edit') + ', <a href="" class="delete_person_button" id="delete_person_' + person['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_person_button").click(function(evt){
                    var id = $(this).attr('id').replace('delete_person_', '');
                    delete_person(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_person_message").show();
                //$("#personstable").hide();
            }
        }

        if ($('#person_categories').length){
            $('#person_categories').empty();
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                $("#person_categories").append('<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + name + '</label>');
            }
        }
    });
}

function get_locations(){
    $.getJSON("/api/locations", function(result){
        locations = result['locations'];

        if ($('#locationbuttons').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + location['name'] + '</label>');
            }
        }

        if ($('#locationstable').length){
            $('#locationstable tbody tr:not(:first)').remove();

            if (locations.length > 0){
                $("#no_location_message").hide();
                //$("#locationstable").show();

                for (var i=0, location; location = locations[i]; i++){
                    $("#locationstable").append('<tr><td>' + location['name'] + '</td><td>' + get_printable_value(location['description']) + '</td><td>' + get_location_page_link(location['id'], 'Edit') + ', <a href="" class="delete_location_button" id="delete_location_' + location['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_location_button").click(function(){
                    var id = $(this).attr('id').replace('delete_location_', '');
                    delete_location(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_location_message").show();
                //$("#locationstable").hide();
            }
        }

        if ($('#location_categories').length){
            $('#location_categories').empty();
            for (var i=0, location; location = locations[i]; i++){
                $("#location_categories").append('<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + location['name'] + '</label>');
            }

        }
    });
}

function get_tags(){
    $.getJSON("/api/tags", function(result){
        tags = result['tags'];

        if ($('#tagbuttons').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label>');
            }
        }

        if ($('#tagstable').length){
            $('#tagstable tbody tr:not(:first)').remove();

            if (tags.length > 0){
                $("#no_tag_message").hide();
                //$("#tagstable").show();

                for (var i=0, tag; tag = tags[i]; i++){
                    $("#tagstable").append('<tr><td>' + tag['name'] + '</td><td>' + get_tag_page_link(tag['id'], 'Edit') + ', <a href="" class="delete_tag_button" id="delete_tag_' + tag['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_tag_button").click(function(){
                    var id = $(this).attr('id').replace('delete_tag_', '');
                    delete_tag(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_tag_message").show();
                //$("#tagstable").hide();
            }
        }

        if ($('#tag_categories').length){
            $('#tag_categories').empty();
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tag_categories").append('<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label>');
            }
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

// TODO: move code to get_files (and check if id exists)?
function get_all_files(){
    $.getJSON("/api/files", function(result){
        $("#filestable").empty();
        $("#filestable").append('<tr><th>Path</th><th>Description</th><th>Age</th><th>Date and Time</th><th>Persons</th><th>Locations</th><th>Tags</th><th>Actions</th></tr>');
        var files = result['files'];
        for (var i=0, file; file = files[i]; i++){
            var datetime = file['datetime'];
            var age = null;
            if (datetime != null){
                age = get_age(datetime);
            }
            // TODO: create links to pages for person, location and tag?
            var numPersons = file['persons'].length;
            var numLocations = file['locations'].length;
            var numTags = file['tags'].length;
            $("#filestable").append('<tr><td><a href="/api/filecontent/' + file['id'] + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + numPersons + '</td><td>' + numLocations + '</td><td>' + numTags + '</td><td><a href="" class="delete_file_button" id="delete_file_' + file['id'] + '">Delete</a></td></tr>');
        }

        $(".delete_file_button").click(function(){
            var id = $(this).attr('id').replace('delete_file_', '');
            delete_file(id);
            return false; // do not follow link
        });
    });
}

function start_categorize_files(){
    if (categorize_files != null && categorize_files.length > 0){
        if (categorize_files_index == -1){
            categorize_files_index = 0;
        }
        else{
            categorize_files_index++;
            if (categorize_files_index >= categorize_files.length) {
                categorize_files_index = 0;
            }
        }
    }
}

function categorize_file(){
    var file = categorize_files[categorize_files_index];
    var file_description = file['description'];
    var file_date = file['datetime'];
    var file_url = '/api/filecontent/' + file['id'];

    $('#categorize_file_path').text(file['path']);

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

    if ($('#categorize_image').length){
        $('#categorize_image').attr('src', file_url);
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

    // TODO: update meta-data for file on page

}

// TODO: use only one function with arguments for finding file to categorize?
function categorize_file_without_any(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['persons'].length == 0 && file['locations'].length == 0 && file['tags'].length == 0 && file['description'] == null){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
    }
}

function categorize_file_without_person(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['persons'].length == 0){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
    }
}

function categorize_file_without_location(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['locations'].length == 0){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
    }
}

function categorize_file_without_tag(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['tags'].length == 0){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
    }
}

function categorize_file_without_description(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['description'] == null){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
    }
}

function categorize_file_without_date(){
    start_categorize_files();
    if (categorize_files_index != -1){
        for (var file; file = categorize_files[categorize_files_index]; categorize_files_index++){
            if (file['datetime'] == null){
                categorize_file();
                break;
            }
        }
        // TODO: hide image and show message
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

        // TODO: add file description and date
        var jsonData = JSON.stringify(
        {
            "persons": selected_persons,
            "locations": selected_locations,
            "tags": selected_tags
        });

        $.ajax
        ({
            type: "PUT",
            url: '/api/file/' + categorize_files[categorize_files_index]['id'],
            contentType : 'application/json',
            data: jsonData,
            success: function(){
                //alert("Thanks!");
            }
        })
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

    var text = slideshow_files.length + " file matches with categories:<br>";

    if (Object.keys(persons).length > 0 || Object.keys(locations).length > 0 || Object.keys(tags).length > 0){
        // TODO: does the following syntex for for-loops work?
        for (var person_id in persons){
            var person = find_person(person_id);
            if (person != null){
                text += get_person_page_link(person_id, person['firstname'] + ' ' + person['lastname']) + item_separator;
            }
        }

        for (var location_id in locations){
            var location = find_location(location_id);
            if (location != null){
                text += get_location_page_link(location_id, location['name']) + item_separator;
            }
        }

        for (var tag_id in tags){
            var tag = find_tag(tag_id);
            if (tag != null){
                text += get_tag_page_link(tag['name']) + item_separator;
            }
        }

        text = remove_text_ending(text, item_separator);
    }
    else{
        text += "none";
    }

    $("#search_result_text").html(text);

    // TODO: remove previously loaded image
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

    var file_text = "Showing file: " + (slideshow_index + 1) + "/" + slideshow_files.length;

    var file_datetime = file['datetime'];
    if (file_datetime != null){
        file_text += "<br>Date: " + file_datetime + " (" + get_age(file_datetime) + " years ago)";
    }

    var file_description = file["description"];
    if (file_description != null){
        file_text += "<br>Description: " + file_description;
    }

    var item_separator = ', ';

    var file_person_ids = file['persons'];
    if (file_person_ids.length > 0){
        file_text += "<br>Persons: ";
        for (var i=0, person_id; person_id = file_person_ids[i]; i++){
           var person = find_person(person_id);
           if (person != null){
               file_text += get_person_page_link(person_id, person['firstname'] + ' ' + person['lastname']) + item_separator;
           }
        }
        file_text = remove_text_ending(file_text, item_separator);
    }

    var file_location_ids = file['locations'];
    if (file_location_ids.length > 0){
        file_text += "<br>Locations: ";
        for (var i=0, location_id; location_id = file_location_ids[i]; i++){
           var location = find_location(location_id);
           if (location != null){
               file_text += get_location_page_link(location_id, location['name']) + item_separator;
           }
        }
        file_text = remove_text_ending(file_text, item_separator);
    }

    var file_tag_ids = file['tags'];
    if (file_tag_ids.length > 0){
        file_text += "<br>Tags: ";
        for (var i=0, tag_id; tag_id = file_tag_ids[i]; i++){
           var tag = find_tag(file_tag_id);
           if (tag != null){
               file_text += get_tag_page_link(tag_id, tag['name']) + item_separator;
           }
        }
        file_text = remove_text_ending(file_text, item_separator);
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

function restart_slideshow(){
    slideshow_index = 0;
    load_slideshow_file();
}

function clear_slideshow(){
    slideshow_files = null;
    slideshow_index = -1;
    $("#slideshow_item_text").text("No search result available");
    $('#slideshow_image').attr('src', '');
    $('#slideshow_image').attr('alt', '');
}

function next_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index < slideshow_files.length - 1){
        slideshow_index++;
        load_slideshow_file();
    }
}

function prev_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index > 0){
        slideshow_index--;
        load_slideshow_file();
    }
}

function random_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 1){
        slideshow_index = parseInt(Math.random() * slideshow_files.length, 10);
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

function delete_file(id){
    $.ajax({
        url: '/api/file/' + id,
        type: 'DELETE',
        success: function(result){
            get_all_files();
        }
    })
    .fail(function(){
        alert('Delete file failed');
    });
}

function delete_person(id){
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

function delete_location(id){
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

function delete_tag(id){
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

function post_add_person_form(){
    $.post("/api/person", $("#add_person_form").serialize(), function(json){
        get_persons();
    }, "json")
    .fail(function(){
        alert("Add person failed");
    });
}

function post_add_location_form(){
    $.post("/api/location", $("#add_location_form").serialize(), function(json){
        get_locations();
    }, "json")
    .fail(function(){
        alert("Add location failed");
    });
}

function post_add_tag_form(){
    $.post("/api/tag", $("#add_tag_form").serialize(), function(json){
        get_tags();
    }, "json")
    .fail(function(){
        alert("Add tag failed");
    });
}

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

function get_age(dateString){
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())){
        age--;
    }
    return age;
}

function get_person_page_link(person_id, link_text){
    return '<a href="/person/' + person_id + '">' + link_text + '</a>';
}

function get_location_page_link(location_id, link_text){
    return '<a href="/location/' + location_id + '">' + link_text + '</a>';
}

function get_tag_page_link(tag_id, link_text){
    return '<a href="/tag/' + tag_id + '">' + link_text + '</a>';
}
