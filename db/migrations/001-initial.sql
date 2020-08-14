-- Up

create table HistoryEntry (
    id integer primary key,
    frame_id integer not null,
    heap text,    -- JSONR format
    interop text, -- JSONR format
    line_no integer,
    constraint HistoryEntry_fk_frame_id foreign key (frame_id)
        references StackFrame(id)
);

create table Object (
    id integer primary key,
    data text  -- JSONR format
);

create table StackFrame (
    id integer primary key,
    fun_name text,
    parameters text, -- JSONR format
    variables text,  -- JSONR format
    parent_id integer,
    
    constraint StackFrame_fk_parent_id foreign key (parent_id)
        references StackFrame(id)
);

-- Down
drop index HistoryEntry_fk_frame_id;
drop table HistoryEntry;
drop table Object;
drop index StackFrame_fk_parent_id;
drop table StackFrame;

