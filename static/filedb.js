var persons = null;
var locations = null;
var tags = null;

var categorize_files = null;
var categorize_result = null; // An array of indexes from a categorize search to be used in categorize_files
var categorize_result_index = -1;

var slideshow_files = null;
var slideshow_index = -1;
var slideshow_timer = null;
var slideshow_interval = 3000;
var slideshow_repeat = false;
var slideshow_random = false;

var edited_person_id = -1;
var edited_location_id = -1;
var edited_tag_id = -1;

function filedb_init_files_page(){
    $("#import_button").click(function(){
        import_files();
    });
    
    $("#add_files_from_directory_update_button").click(function(){
        fetch_directories_to_add("/api/directories");
    });
    
    $("#add_files_from_directory_update_fs_button").click(function(){
        fetch_directories_to_add("/api/fs_directories");
    });
    
    $("#add_files_from_directory_add_button").click(function(){
        var directory_to_add = $("#add_files_directory_list .selectedLi").text();
        if (directory_to_add) {
            post_add_directory(directory_to_add);
        }
    });
    
    $("#delete_files_from_directory_update_button").click(function(){
        fetch_directories_to_delete();
    });
    
    $("#delete_files_from_directory_delete_button").click(function(){
        var directory_to_delete = $("#delete_files_directory_list .selectedLi").text();
        if (directory_to_delete) {
            delete_delete_directory(directory_to_delete);
        }
    });

    $('#button_show_directories').click(function(){
        update_list_of_directories();
    });

    $("#button_show_all_files").click(function(){
        update_list_of_files();
    });
    
    $("#consistency_check_button").click(function(){
        consistency_check();
    });    
}

function fetch_directories_to_add(url){
    clear_add_files_results();
    $("#add_files_directory_list").html("");
    $("#add_files_status").text("Fetching directories...");
    $.getJSON(url, function(result){
        directories = result['directories'];
        if (directories.length > 0){
            for (var i=0, directory; directory = directories[i]; i++){
                $("#add_files_directory_list").append('<li><a href="#">' + directory + "</a></li>");
            }
            $("#add_files_from_directory_add_button").removeAttr('disabled');
            // Add a "selected class" when list items clicked to be able to find it later
            $("#add_files_directory_list li a").click(function(){
                $('.selectedLi').removeClass('selectedLi');
                $(this).addClass('selectedLi');
            });
        }
        $("#add_files_status").text("Fetching directories... Done");
    });
}

function fetch_directories_to_delete(){
    clear_add_files_results();
    $("#delete_files_directory_list").html("");
    $("#delete_files_status").text("Fetching directories...");
    $.getJSON('/api/directories', function(result){
        directories = result['directories'];
        if (directories.length > 0){
            for (var i=0, directory; directory = directories[i]; i++){
                $("#delete_files_directory_list").append('<li><a href="#">' + directory + "</a></li>");
            }
            $("#delete_files_from_directory_delete_button").removeAttr('disabled');
            // Add a "selected class" when list items clicked to be able to find it later
            $("#delete_files_directory_list li a").click(function(){
                $('.selectedLi').removeClass('selectedLi');
                $(this).addClass('selectedLi');
            });
        }
        $("#delete_files_status").text("Fetching directories... Done");
    });
}

function filedb_init_categorize_page(){
    get_persons();
    get_locations();
    get_tags();
    
    $('#find_file_wo_any_button').click(function(){
        search_categorize_files(no_meta_data_comparator);
    });

    $('#find_file_wo_person_button').click(function(){
        search_categorize_files(no_person_comparator);
    });

    $('#find_file_wo_location_button').click(function(){
        search_categorize_files(no_location_comparator);
    });

    $('#find_file_wo_tag_button').click(function(){
        search_categorize_files(no_tag_comparator);
    });

    $('#find_file_wo_description_button').click(function(){
        search_categorize_files(no_description_comparator);
    });

    $('#find_file_wo_date_button').click(function(){
        search_categorize_files(no_date_comparator);
    });

    $('#find_file_by_path_button').click(function(){
        categorize_file_from_path();
    });

    $('#find_file_by_path_regexp_button').click(function(){
        categorize_file_from_path_regexp();
    });

    $('#prev_file_categorize_button').click(function(){
        prev_categorize_file();
    });

    $('#next_file_categorize_button').click(function(){
        next_categorize_file();
    });

    $('#save_file_categorize_button').click(function(){
        save_file_categorization();
    });

    $('#save_for_all_files_button').click(function(){
        save_categorization_for_all();
    });
}

function filedb_init_browse_page(){
    get_persons();
    get_locations();
    get_tags();
    
    $('#file_path_regexp_button').click(function(){
        search_files_by_path();
    });

    $('#file_description_regexp_button').click(function(){
        search_files_by_description();
    });

    $('#file_date_regexp_button').click(function(){
        search_files_by_datetime();
    });
    
    $("#reset_search_criteria_button").click(function(){
        reset_search_criteria();
    });

    $("#clear_search_button").click(function(){
        clear_search_result();
    });

    $("#search_files_by_persons_button").click(function(){
        search_files_by_persons();
    });

    $("#search_files_by_locations_button").click(function(){
        search_files_by_locations();
    });

    $("#search_files_by_tags_button").click(function(){
        search_files_by_tags();
    });
    
    $("#search_files_by_all_button").click(function(){
        search_files_by_all();
    });

    $('#slideshow_restart_button').click(function(){
        restart_slideshow();
    });

    $('#slideshow_end_button').click(function(){
        end_slideshow();
    });

    $('#slideshow_fullscreen_button').click(function(){
        open_fullscreen_slideshow();
    });

    $('#slideshow_prev_file_button').click(function(){
        prev_slideshow_file();
    });

    $('#slideshow_next_file_button').click(function(){
        next_slideshow_file();
    });

    $('#slideshow_prev_directory_button').click(function(){
        prev_directory_slideshow();
    });
    
    $('#slideshow_next_directory_button').click(function(){
        next_directory_slideshow();
    });

    $('#slideshow_toggle_random_button').click(function(){
        toggle_slideshow_random();
    });

    $("#slideshow_toggle_button").click(function(){
        toggle_slideshow();
    });

    $("#slideshow_toggle_repeat_button").click(function(){
        toggle_slideshow_repeat();
    });
    
    $('#export_absolute_paths').click(function(){
        export_absolute_paths();
    });

    $('#export_relative_paths').click(function(){
        export_relative_paths();
    });

    $('#export_zip_file').click(function(){
        export_zip_file();
    });
}

function filedb_init_categories_page(){
    get_persons();
    get_locations();
    get_tags();
    
    $("#add_person_form").submit(function(evt){
        evt.preventDefault();
        modify_person();
    });

    $("#add_location_form").submit(function(evt){
        evt.preventDefault();
        modify_location();
    });

    $("#add_tag_form").submit(function(evt){
        evt.preventDefault();
        modify_tag();
    });
}

function get_persons(){
    $.getJSON("/api/persons?orderby=firstname", function(result){
        persons = result['persons'];

        if ($('#multiplepersonselect').length){
            var personOptions = "";
            for (var i=0, person; person = persons[i]; i++){
                personOptions += '<option value="' + person['id'] + '">' + get_person_span(person) + '</option>';
            }
            $("#multiplepersonselect").html(personOptions);
        }

        if ($('#personsdiv').length){
            reload_persons_table();
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

function reload_persons_table(){
    if (persons.length > 0){
        // TODO: do not set table id? istead search for the table inside personsdiv below?
        $('#personsdiv').html('<table class="table" id="personstable"><tr><th>First Name</th><th>Last Name</th><th>Description</th><th>Age</th><th>Date of Birth</th><th>Actions</th></tr></table>');

        var now = new Date();

        var personRows = '';
        for (var i=0, person; person = persons[i]; i++){
            var dateofbirth = person['dateofbirth'];
            var age = null;
            if (dateofbirth != null){
                age = get_age(dateofbirth, now);
            }
            personRows += '<tr id="tr_person_' + person['id'] + '"><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td><a href="#persons_header" class="edit_person_button" id="edit_person_' + person['id'] + '">Edit</a>, <a href="" class="delete_person_button" id="delete_person_' + person['id'] + '">Delete</a></td></tr>';
        }
        $("#personstable").append(personRows);

        $(".edit_person_button").click(function(evt){
            var id = $(this).attr('id').replace('edit_person_', '');
            if (id == edited_person_id){
                clear_edit_person();
                return false; // do not follow link
            }
            else if (edited_person_id == -1){
                prepare_edit_person(id);
                return true; // do follow link
            }
        });

        $(".delete_person_button").click(function(evt){
            var id = $(this).attr('id').replace('delete_person_', '');
            delete_person(id);
            return false; // do not follow link
        });
    }
    else{
        $('#personsdiv').text('No persons added yet.');
    }
}

function get_locations(){
    $.getJSON("/api/locations?orderby=name", function(result){
        locations = result['locations'];

        if ($('#multiplelocationselect').length){
            var options = "";
            for (var i=0, location; location = locations[i]; i++){
                options += '<option value="' + location['id'] + '">' + get_location_span(location) + '</option>';
            }
            $('#multiplelocationselect').html(options);
        }

        if ($('#locationsdiv').length){
            reload_locations_table();
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

function reload_locations_table(){
    if (locations.length > 0){
        // TODO: do not set table id? istead search for the table inside locationsdiv below?
        $('#locationsdiv').html('<table class="table" id="locationstable"><tr><th>Name</th><th>Description</th><th>Position (Latitude and Longitude)</th><th>Actions</th></tr></table>');

        var locationRows = "";
        for (var i=0, location; location = locations[i]; i++){
            locationRows += '<tr id="tr_location_' + location['id'] + '"><td>' + location['name'] + '</td><td>' + get_printable_value(location['description']) + '</td><td>' + get_position_map_link(location) + '</td><td><a href="#locations_header" class="edit_location_button" id="edit_location_' + location['id'] + '">Edit</a>, <a href="" class="delete_location_button" id="delete_location_' + location['id'] + '">Delete</a></td></tr>';
        }
        $("#locationstable").append(locationRows);

        $(".edit_location_button").click(function(){
            var id = $(this).attr('id').replace('edit_location_', '');
            if (id == edited_location_id){
                clear_edit_location();
                return false; // do not follow link
            }
            else if (edited_location_id == -1){
                prepare_edit_location(id);
                return true; // do follow link
            }
        });

        $(".delete_location_button").click(function(){
            var id = $(this).attr('id').replace('delete_location_', '');
            delete_location(id);
            return false; // do not follow link
        });
    }
    else{
        $('#locationsdiv').text('No locations added yet.');
    }
}

function get_tags(){
    $.getJSON("/api/tags?orderby=name", function(result){
        tags = result['tags'];

        if ($('#multipletagselect').length){
            var options = "";
            for (var i=0, tag; tag = tags[i]; i++){
                options += '<option value="' + tag['id'] + '">' + tag['name'] + '</option>';
            }
            $('#multipletagselect').html(options);
        }

        if ($('#tagsdiv').length){
            reload_tags_table();
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

function reload_tags_table(){
    if (tags.length > 0){
        // TODO: do not set table id? istead search for the table inside tagsdiv below?
        $('#tagsdiv').html('<table class="table" id="tagstable"><tr><th>Name</th><th>Actions</th></tr></table>');

        var tagRows = "";
        for (var i=0, tag; tag = tags[i]; i++){
            tagRows += '<tr id="tr_tag_' + tag['id'] + '"><td>' + tag['name'] + '</td><td><a href="#tags_header" class="edit_tag_button" id="edit_tag_' + tag['id'] + '">Edit</a>, <a href="" class="delete_tag_button" id="delete_tag_' + tag['id'] + '">Delete</a></td></tr>';
        }
        $("#tagstable").append(tagRows);

        $(".edit_tag_button").click(function(){
            var id = $(this).attr('id').replace('edit_tag_', '');
            if (id == edited_tag_id){
                clear_edit_tag();
                return false; // do not follow link
            }
            else if (edited_tag_id == -1){
                prepare_edit_tag(id);
                return true; // do follow link
            }
        });

        $(".delete_tag_button").click(function(){
            var id = $(this).attr('id').replace('delete_tag_', '');
            delete_tag(id);
            return false; // do not follow link
        });
    }
    else{
        $('#tagsdiv').text('No tags added yet.');
    }
}

function get_files(){
    $.getJSON("/api/files", function(result){
        if ($('#categorize_image_div').length){
            categorize_files = result['files'];
        }
    });
}

function update_list_of_directories(){
    if (window.confirm("Listing all remote directories from the filesystem may take a while. Continue?")){
        $("#files_status").text("Loading directories...");
        $.getJSON("/api/fs_directories", function(result){
            update_directories_table(result['directories']);
        })
        .always(function(){
            $("#files_status").text("");
        });
    }
}

function update_list_of_files(){
    if (window.confirm("Download all file information may take a while. Continue?")){
        $("#files_status").text("Loading files...");
        $.getJSON("/api/files", function(result){
            update_files_table(result['files']);
        })
        .always(function(){
            $("#files_status").text("");
        });
    }
}

function clear_files_table(){
    $("#filestable").empty();
}

function update_files_table(files_json){
    var tableRows = '<tr><th>File</th><th>Description</th><th>Age</th><th>Date and Time</th><th>Persons</th><th>Locations</th><th>Tags</th><th>Actions</th></tr>';
    var now = new Date();
    for (var i=0, file; file = files_json[i]; i++){
        var datetime = file['datetime'];
        var age = null;
        if (datetime != null){
            age = get_age(datetime, now);
        }
        var numPersons = file['persons'].length;
        var numLocations = file['locations'].length;
        var numTags = file['tags'].length;
        var fileId = file['id'];
        tableRows += '<tr id="filerow_' + fileId + '"><td><a href="/api/filecontent/' + fileId + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + numPersons + '</td><td>' + numLocations + '</td><td>' + numTags + '</td><td><a href="" class="delete_file_button" id="delete_file_' + fileId + '">Delete</a>, <a href="/api/fileexif/' + fileId + '">Exif</a></td></tr>';
    }

    $("#filestable").empty();
    $("#filestable").append(tableRows);

    $(".delete_file_button").click(function(){
        var id = $(this).attr('id').replace('delete_file_', '');
        delete_file(id);
        return false; // do not follow link
    });
}

function update_directories_table(directories_json){
    var tableRows = '<tr><th>Directory</th></tr>';
    for (var i=0, directory; directory = directories_json[i]; i++){
        tableRows += '<tr><td class="clickabletext">' + directory + '</td></tr>';
    }

    $("#directoriestable").empty();
    $("#directoriestable").append(tableRows);
    $(".clickabletext").click(function() {
        // Copy directory to form input
        $('#add_directory_form :input[name=path]').val(this.innerHTML);
    });
}

function prev_categorize_file(){
    if (categorize_result_index > 0){
        categorize_result_index--;
        categorize_file();
    }
}

function next_categorize_file(){
    if (categorize_result_index != -1 && categorize_result_index < categorize_result.length - 1){
        categorize_result_index++;
        categorize_file();
    }
}

function categorize_file(){
    var file = categorize_files[categorize_result[categorize_result_index]];
    var file_description = file['description'];
    var file_date = file['datetime'];
    var file_url = '/api/filecontent/' + file['id'];

    $('#categorize_file_path').text("[" + (categorize_result_index+1) + "/" + categorize_result.length + "] " + file['path']);

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
    $('#categorize_image_div').empty();
    
    // Make a HEAD request to find out file type (it is not known from the URL)
    // TODO: this code is duplicated from the browse page part
    $.ajax({
        type: "HEAD",
        url: file_url,
        success: function(data, textStatus, xhr){
            var content_type = xhr.getResponseHeader("content-type") || "";
            if (is_content_type_image(content_type)){
                var img = $('<img />', {
                    id: 'categorize_image',
                    src: file_url,
                    alt: file_url,
                    class: 'limited_img'
                });
                img.appendTo($('#categorize_image_div'));
            }
            else{
                // Note: target blank to not clear search result
                $('#categorize_image_div').html('<a href="' + file_url + '" target="_blank">Open file of type ' + content_type + '</a>');
            }
            update_image_div_height('#categorize_image_div');
        },
        error: function(){
            // TODO: show a bootstrap error div and add a link
            $('#categorize_image_div').html('Unable to load file, see <a href="/help#troubleshooting">troubleshooting</a>!');
            update_image_div_height('#categorize_image_div');
        }
    });
}

function update_image_div_height(selector){
    set_div_height(selector, 0.75);
}

function set_div_height(selector, factor){
    var height = $(selector).width() * factor;
    $(selector).css({'height': height + 'px'});
}

function search_categorize_files(comparator){
    if (categorize_files != null){
        categorize_result = [];
        for (var file, i=0; file = categorize_files[i]; i++){
            if (comparator(file)){
                categorize_result.push(i);
            }
        }
        update_categorize_result();
    }
}

function no_meta_data_comparator(file){
    return file['persons'].length == 0 &&
           file['locations'].length == 0 &&
           file['tags'].length == 0 &&
           file['description'] == null;
}

function no_person_comparator(file){
    return file['persons'].length == 0;
}

function no_location_comparator(file){
    return file['locations'].length == 0;
}

function no_tag_comparator(file){
    return file['tags'].length == 0;
}

function no_description_comparator(file){
    return file['description'] == null;
}

function no_date_comparator(file){
    return file['datetime'] == null;
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
        categorize_result_index = 0;
        categorize_file();
    }
    else{
        clear_categorize_result();
    }
}

function clear_categorize_result(){
    $('#categorize_file_path').text("N/A");
    $('#file_description').val("");
    $('#file_date').val("");
    if ($('#categorize_image').length){
        $('#categorize_image').attr('src', '');
        $('#categorize_image').attr('alt', '');
    }
    for (var i=0, person; person = persons[i]; i++){
        $('#person_' + person['id']).prop('checked', false);
    }
    for (var i=0, location; location = locations[i]; i++){
        $('#location_' + location['id']).prop('checked', false);
    }
    for (var i=0, tag; tag = tags[i]; i++){
        $('#tag_' + tag['id']).prop('checked', false);
    }
}

function createJsonDataForFileCategorization(){
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

    return jsonData;
}

function find_categorize_file_index_from_id(file_id){
    alert("Checking id: " + file_id);
    if (categorize_result_index != -1){
        for (var j=0; j<categorize_result.length; j++){
            if (categorize_files[categorize_result[j]]['id'] == file_id){
                return j;
            }
        }
    }
    else{
        alert("categorize_result_index == -1");
    }
    return -1;
}

function save_file_categorization(){
    if (categorize_result_index != -1){
        var jsonData = createJsonDataForFileCategorization();

        $("#save_categorization_status").text("Saving...");
        $.ajax
        ({
            type: "PUT",
            url: '/api/file/' + categorize_files[categorize_result[categorize_result_index]]['id'],
            contentType : 'application/json',
            data: jsonData,
            dataType: "json",
            success: function(responseData){
                $("#save_categorization_status").text("Saved successfully");
                categorize_files[categorize_result[categorize_result_index]] = responseData;
            },
            error: function(){
                $("#save_categorization_status").text("An error occured");
            }
        });
    }
    else{
        show_no_categorize_result();
    }
}

function save_categorization_for_all(){
    if (categorize_result_index != -1){
        if (window.confirm("Replace all meta-data for " + categorize_result.length + " files?")){
            for (var i=0; i<categorize_result.length; i++){
                var jsonData = createJsonDataForFileCategorization();
                // TODO: add a countdown text or progress bar to page?
                $.ajax
                ({
                    type: "PUT",
                    url: '/api/file/' + categorize_files[categorize_result[i]]['id'],
                    contentType : 'application/json',
                    data: jsonData,
                    dataType: "json",
                    success: function(responseData){
                        var file_index_to_update = find_categorize_file_index_from_id(responseData['id']);
                        if (file_index_to_update != -1){
                            // TODO: need this to avoid duplicates?
                            // delete categorize_files[file_index_to_update];
                            categorize_files[file_index_to_update] = responseData;
                        }
                        else{
                            // TODO: why does this happen sometimes?
                            alert("Could not find returned entry for id " + responseData['id'] + ". Searched data: " + JSON.stringify(categorize_files));
                        }
                    },
                    error: function(){
                        alert("Error");
                    }
                });
            }
        }
    }
    else{
        show_no_categorize_result();
    }
}

function show_no_categorize_result(){
    alert('Please find a file to categorize');
}

function create_files_url(include_persons, include_locations, include_tags, include_path_regexp, include_description_regexp, include_datetime_regexp){
    var checked_persons = '';
    if (include_persons){
        var selected_person_values = $('#multiplepersonselect').val();
        if (selected_person_values != null){
            for (var i=0, value; value = selected_person_values[i]; i++){
                checked_persons += value + ',';
            }
        }
        if (checked_persons != ''){
            checked_persons = checked_persons.slice(0, -1);
        }
    }

    var checked_locations = '';
    if (include_locations){
        var selected_location_values = $('#multiplelocationselect').val();
        if (selected_location_values != null){
            for (var i=0, value; value = selected_location_values[i]; i++){
                checked_locations += value + ',';
            }
        }
        if (checked_locations != ''){
            checked_locations = checked_locations.slice(0, -1);
        }
    }

    var checked_tags = '';
    if (include_tags){
        var selected_tag_values = $('#multipletagselect').val();
        if (selected_tag_values != null){
            for (var i=0, value; value = selected_tag_values[i]; i++){
                checked_tags += value + ',';
            }
        }
        if (checked_tags != ''){
            checked_tags = checked_tags.slice(0, -1);
        }
    }
    
    var path_regexp = '';
    if (include_path_regexp){
        var regexp = $('#file_path_regexp_filter').val();
        if (regexp.length > 0){
            path_regexp = encodeURIComponent(regexp);
        }
    }
    
    var description_regexp = '';
    if (include_description_regexp){
        var regexp = $('#file_description_regexp_filter').val();
        if (regexp.length > 0){
            description_regexp = encodeURIComponent(regexp);
        }
    }
    
    var datetime_regexp = '';
    if (include_datetime_regexp){
        var regexp = $('#file_date_regexp_filter').val();
        if (regexp.length > 0){
            datetime_regexp = encodeURIComponent(regexp);
        }
    }

    return '/api/files?personids=' + checked_persons + '&locationids=' + checked_locations + '&tagids=' + checked_tags + '&pathregexp=' + path_regexp + '&descriptionregexp=' + description_regexp + '&datetimeregexp=' + datetime_regexp;
}

function reset_search_criteria(){
    $("#multiplepersonselect option:selected").prop("selected", false);
    $("#multiplelocationselect option:selected").prop("selected", false);
    $("#multipletagselect option:selected").prop("selected", false);
    $('#file_path_regexp_filter').val('');
    $('#file_description_regexp_filter').val('');
    $('#file_date_regexp_filter').val('');
}

function clear_search_result(){
    $("#search_result_text").text("No search result available");
    clear_previous_search();
    clear_slideshow();
}

function clear_previous_search(){
    // Clear any previous search result (error message or image)
    $('#file_browser_image_div').html('');
}

function search_files_by_persons(){
    clear_previous_search();
    if ($("#multiplepersonselect :selected").length > 0) {
        var url = create_files_url(true, false, false, false, false, false);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("No person selected");
    }
}

function search_files_by_locations(){
    clear_previous_search();
    if ($("#multiplelocationselect :selected").length > 0) {
        var url = create_files_url(false, true, false, false, false, false);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("No location selected");
    }
}

function search_files_by_tags(){
    clear_previous_search();
    if ($("#multipletagselect :selected").length > 0) {
        var url = create_files_url(false, false, true, false, false, false);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("No tag selected");
    }
}

function search_files_by_all(){
    clear_previous_search();
    var url = create_files_url(true, true, true, true, true, true);
    $.getJSON(url, function(result){
        update_search_result(result);
        show_slideshow();
    });
}

function search_files_by_path(){
    clear_previous_search();
    var regexp = $('#file_path_regexp_filter').val();
    if (regexp.length > 0){
        var url = create_files_url(false, false, false, true, false, false);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("Specify a file path regexp");
    }
}

function search_files_by_description(){
    clear_previous_search();
    var regexp = $('#file_description_regexp_filter').val();
    if (regexp.length > 0){
        var url = create_files_url(false, false, false, false, true, false);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("Specify a file description regexp");
    }
}

function search_files_by_datetime(){
    clear_previous_search();
    var regexp = $('#file_date_regexp_filter').val();
    if (regexp.length > 0){
        var url = create_files_url(false, false, false, false, false, true);
        $.getJSON(url, function(result){
            update_search_result(result);
            show_slideshow();
        });
    }
    else{
        alert("Specify a file date and time regexp");
    }
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

    var text = slideshow_files.length + " of " + files_json['total_num_files'] + " files visible with categories: ";

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

function is_content_type_image(content_type){
    return content_type.startsWith('image/');
}

function load_slideshow_file(){
    var file = slideshow_files[slideshow_index];
    var file_url = '/api/filecontent/' + file['id'];

    $('#slideshow_file_header').text(": [" + (slideshow_index + 1) + "/" + slideshow_files.length + "] " + file['path']);

    $('#file_browser_image_div').empty();
    update_image_div_height('#file_browser_image_div');

    // Make a HEAD request to find out file type (it is not known from the URL)
    $.ajax({
        type: "HEAD",
        url: file_url,
        success: function(data, textStatus, xhr){
            var content_type = xhr.getResponseHeader("content-type") || "";
            if (is_content_type_image(content_type)){
                var img = $('<img />', {
                    id: 'slideshow_image',
                    src: file_url,
                    alt: file_url,
                    class: 'limited_img'
                });
                img.appendTo($('#file_browser_image_div'));
            }
            else{
                // Note: target blank to not clear search result
                $('#file_browser_image_div').html('<a href="' + file_url + '" target="_blank">Open file of type ' + content_type + '</a>');
            }
            update_image_div_height('#file_browser_image_div');
        },
        error: function(){
            // TODO: show a bootstrap error div and add a link
            $('#file_browser_image_div').html('Unable to load file, see <a href="/help#troubleshooting">troubleshooting</a>!');
            update_image_div_height('#file_browser_image_div');
        }
    });

    var file_text = "";

    var file_datetime = file['datetime'];
    if (file_datetime != null){
        file_text += file_datetime.replace('T', ' ') + " (" + get_age(file_datetime, new Date()) + " years ago)";
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
                var person_dateofbirth = person['dateofbirth'];
                if (file_datetime != null && person_dateofbirth != null){
                    person_age_in_file = " (" + get_age(person_dateofbirth, file_datetime_object) + ")";
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

function find_person(person_id){
    var person_index = find_person_index(person_id);
    if (person_index != -1){
        return persons[person_index];
    }
    return null;
}

function find_person_index(person_id){
    if (persons != null){
        for (var i=0, person; person = persons[i]; i++){
            if (person['id'] == person_id){
                return i;
            }
        }
    }
    return -1;
}

function find_location(location_id){
    var location_index = find_location_index(location_id);
    if (location_index != -1){
        return locations[location_index];
    }
    return null;
}

function find_location_index(location_id){
    if (locations != null){
        for (var i=0, location; location = locations[i]; i++){
            if (location['id'] == location_id){
                return i;
            }
        }
    }
    return -1;
}

function find_tag(tag_id){
    var tag_index = find_tag_index(tag_id);
    if (tag_index != -1){
        return tags[tag_index];
    }
    return null;
}

function find_tag_index(tag_id){
    if (tags != null){
        for (var i=0, tag; tag = tags[i]; i++){
            if (tag['id'] == tag_id){
                return i;
            }
        }
    }
    return -1;
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

function toggle_slideshow_repeat(){
    slideshow_repeat = !slideshow_repeat;
    if (slideshow_repeat){
        $("#slideshow_toggle_repeat_button").html('Repeat: On');
    }
    else{
        $("#slideshow_toggle_repeat_button").html('Repeat: Off');
    }
    update_slideshow_buttons();
}

function toggle_slideshow_random(){
    slideshow_random = !slideshow_random;
    if (slideshow_random){
        $("#slideshow_toggle_random_button").html('Random: On');
    }
    else{
        $("#slideshow_toggle_random_button").html('Random: Off');
    }
    update_slideshow_buttons();
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
    if (slideshow_files == null || slideshow_files.length == 0){
        return;
    }
    
    load_slideshow_index(0);
}

function end_slideshow(){
    if (slideshow_files == null || slideshow_files.length == 0){
        return;
    }

    load_slideshow_index(slideshow_files.length - 1);
}

function clear_slideshow(){
    slideshow_files = null;
    slideshow_index = -1;
    $("#slideshow_file_header").text("");
    $("#slideshow_item_text").text("No search result available");
    $('#slideshow_image').attr('src', '');
    $('#slideshow_image').attr('alt', '');
    update_slideshow_buttons();
}

function load_slideshow_index(index){
    slideshow_index = index;
    update_slideshow_buttons();
    load_slideshow_file();
}

function update_slideshow_buttons(){
    var has_slideshow_files = slideshow_files != null && slideshow_files.length > 0;
    
    $("#slideshow_restart_button").prop('disabled', !(has_slideshow_files && slideshow_index > 0));
    $("#slideshow_prev_file_button").prop('disabled', !(has_slideshow_files && slideshow_index > 0));
    $("#slideshow_next_file_button").prop('disabled', !(slideshow_random || slideshow_repeat || (has_slideshow_files && slideshow_index < slideshow_files.length - 1)));
    $("#slideshow_end_button").prop('disabled', !(has_slideshow_files && slideshow_index < slideshow_files.length - 1));
    $("#slideshow_fullscreen_button").prop('disabled', !has_slideshow_files);
    
    // TODO: find out how to set them
    $("#slideshow_prev_directory_button").prop('disabled', false);
    $("#slideshow_next_directory_button").prop('disabled', false);
}

function open_fullscreen_slideshow(){
    if (slideshow_files == null || slideshow_files.length == 0){
        return;
    }

    /*
    // Remove possible old input for fullscreen image browser
    var anchors  = document.getElementsByTagName('a');
    for (var i=anchors.length-1; i>=0; i--){
        var a = anchors[i];
        if (a.id + ''.startsWith('slideshow_file_')){
            a.parentNode.removeChild(a);
        }
    }
    */
    
    lightbox.option({
      'fadeDuration': 100,
      'imageFadeDuration': 100,
      'resizeDuration': 100,
      'positionFromTop': 10
      //'wrapAround': true
    })
    
    // Prepare input for fullscreen image browser
    for (var i=0, file; file = slideshow_files[i]; i++){
        var file_url = '/api/filecontent/' + file['id'];
        var file_link_id = 'slideshow_file_' + file['id'];
        // TODO: set data-title attribute to something nice?
        $('body').append($('<a id="' + file_link_id + '" href="' + file_url + '" data-lightbox="fullscreen_slideshow"></a>'));
    }

    // Click on link for the image being shown to open the fullscreen image browser
    document.getElementById('slideshow_file_' + slideshow_files[slideshow_index]['id']).click();
}

function next_slideshow_file(){
    if (slideshow_files == null || slideshow_files.length == 0){
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
        if (slideshow_index < slideshow_files.length - 1){
            load_slideshow_index(slideshow_index+1);
            return true;
        }
        else if (slideshow_repeat){
            load_slideshow_index(0);
            return true;
        }
    }
    return false;
}

function get_directory_from_path(path){
    var last_slash_index = path.lastIndexOf("/");
    if (last_slash_index == -1){
        return "";
    }
    return path.substring(0, last_slash_index);
}

function prev_directory_slideshow(){
    var current_dir = get_directory_from_path(slideshow_files[slideshow_index]['path']);
    var previous_dir = null;
    for (var i=slideshow_index-1; i>=0; i--){
        var dir = get_directory_from_path(slideshow_files[i]['path']);
        if (previous_dir == null){
            if (current_dir != dir){
                previous_dir = dir;
            }
        }
        else{
            if (previous_dir != dir){
                load_slideshow_index(i+1);
                return;
            }
        }
    }
    
    if (previous_dir != null){
        load_slideshow_index(0);
    }
}

function next_directory_slideshow(){
    var current_dir = get_directory_from_path(slideshow_files[slideshow_index]['path']);
    for (var i=slideshow_index+1; i<slideshow_files.length; i++){
        var dir = get_directory_from_path(slideshow_files[i]['path']);
        if (current_dir != dir){
            load_slideshow_index(i);
            break;
        }
    }
}

function prev_slideshow_file(){
    if (slideshow_files != null && slideshow_files.length > 0 && slideshow_index > 0){
        load_slideshow_index(slideshow_index-1);
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
    $("#files_status").text("");
    $("#delete_files_status").text("");
    $("#rename_files_status").text("");
}

function consistency_check(){
    if (window.confirm("File consistency check for all file entries may take several minutes. Continue?")){
        clear_add_files_results();
        $("#files_status").text("Running, please wait...");
        $.getJSON("/api/fileconsistency", function(result){
            missing_files = result['missing_files'];
            if (missing_files.length == 0){
                $("#files_status").text("File consistency check finished successfully");
                clear_files_table();
            }
            else{
                $("#files_status").text("Found " + missing_files.length + " missing files:");
                update_files_table(missing_files);
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
            if ($('#filestable tr').length == 1){
                clear_files_table();
            }
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
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function(responseData){
            clear_edit_person();
            var personIndex = find_person_index(responseData['id']);
            if (personIndex == -1){
                persons.push(responseData);
            }
            else{
                persons[personIndex] = responseData;
            }
            reload_persons_table();
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
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function(responseData){
            clear_edit_location();
            var locationIndex = find_location_index(responseData['id']);
            if (locationIndex == -1){
                locations.push(responseData);
            }
            else{
                locations[locationIndex] = responseData;
            }
            reload_locations_table();
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

    // Add or update tag
    $.ajax
    ({
        type: method,
        url: url,
        contentType: 'application/json',
        data: jsonData,
        dataType: "json",
        success: function(responseData){
            clear_edit_tag();
            var tagIndex = find_tag_index(responseData['id']);
            if (tagIndex == -1){
                tags.push(responseData);
            }
            else{
                tags[tagIndex] = responseData;
            }
            reload_tags_table();
        },
        error: function(){
            alert("Save tag failed");
        }
    });
}

function post_add_directory(path){
    clear_add_files_results();
    $("#add_files_status").text("Adding files from directory, please wait...");
    var json = {"path": path};
    $.ajax
    ({
        type: 'POST',
        url: "/api/directory",
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function(result){
            $("#add_files_status").html("Added " + result['num_added_files'] + " of " + (result['num_added_files'] + result['num_not_added_files']) + " files in specified directory");
        },
        error: function(){
            $("#add_files_status").text("Failed to add files from directory, please try another name.");
        }
    });
}

function delete_delete_directory(path){
    clear_add_files_results();
    $("#delete_files_status").text("Deleting files from directory, please wait...");
    var json = {"path": path};
    $.ajax
    ({
        type: 'DELETE',
        url: "/api/directory",
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function(result){
            $("#delete_files_status").html('Deleted ' + result['num_deleted_files'] + ' files from specified directory');
        },
        error: function(){
            $("#delete_files_status").text("Failed to delete files from directory");
        }
    });
}

function get_printable_value(value){
    if (value !== null && value !== ""){
        return value;
    }
    return 'N/A';
}

function get_age(date_start_str, date_end){
    var birthDate = new Date(date_start_str);
    var age = date_end.getFullYear() - birthDate.getFullYear();
    var m = date_end.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && date_end.getDate() < birthDate.getDate())){
        age--;
    }
    // This is a fix for if a person is tagged in a file with a date and time before the person was born.
    // This happens especially if a file uses the YYYY date format.
    // In that case 0 looks better than a negative number.
    return Math.max(0, age); 
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

function show_exported_data(data){
    $('#exportresult').html('<pre>' + data + '</pre>');
}

function download_exported_data(data){
    // TODO: how to trigger download dialog?
}

function export_absolute_paths(){
    export_data('/api/exportabspaths', show_exported_data);
}

function export_relative_paths(){
    export_data('/api/exportpaths', show_exported_data);
}

function export_data(url, success_function){
    if (slideshow_files == null || slideshow_files.length == 0){
        $('#exportresult').html('Nothing to export');
        return;
    }
    
    $('#exportresult').html('');
    
    var file_ids = [];
    for (var i=0, file; file = slideshow_files[i]; i++){
        file_ids.push(file['id']);
    }

    var json = {"files": file_ids};
    
    $.ajax
    ({
        type: 'POST',
        url: url,
        contentType: 'application/json',
        data: JSON.stringify(json),
        success: function(data) { success_function(data); },
        error: function(xhr, desc, err){
            $('#exportresult').html('Export failed: ' + desc);
        }
    });
}

function export_zip_file(){
    export_data('/api/exportzip', download_exported_data);
}
