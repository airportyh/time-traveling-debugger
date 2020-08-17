-- Up

create table Snapshot (
    id integer primary key,
    fun_call_id integer not null,
    stack integer,
    heap integer,
    interop integer,
    line_no integer,
    constraint Snapshot_fk_fun_call_id foreign key (fun_call_id)
        references FunCall(id)
);

create table Object (
    id integer primary key,
    data text  -- JSONR format
);

create table FunCall (
    id integer primary key,
    fun_name text,
    parameters integer,
    parent_id integer,
    
    constraint FunCall_fk_parent_id foreign key (parent_id)
        references FunCall(id)
);

-- Down
drop index Snapshot_fk_fun_call_id;
drop table Snapshot;
drop table Object;
drop index FunCall_fk_parent_id;
drop table FunCall;

