"use strict";

var mongoose = require("mongoose");
var Notice = mongoose.model("Notice");
var File = mongoose.model("File");
var User = mongoose.model("User");

var userFields = ["_id", "user_name", "user_email"];

exports.isTitleRepeat = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  var file = await File.find({ file_owner: user._id }).exec();
  if (file.length > 0) {
    for (var i = 0; i < file.length; i++) {
      if (file[i].file_title == body.file_title) {
        ctx.body = {
          success: false,
          err: "文件名已存在"
        };
        return next;
      }
    }
    ctx.body = {
      success: true
    };
    return next;
  } else {
    ctx.body = {
      success: true
    };
  }
};

exports.add = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  var file_partner = [];
  if (body.file_partner.length > 0) {
    for (var i in body.file_partner) {
      var partner = await User.findOne({ user_name: body.file_partner[i] });
      file_partner.push(partner._id.toString());
    }
  }
  var file = new File({
    file_title: body.file_title,
    file_type: body.file_type,
    file_partner: file_partner,
    file_owner: user._id
  });
  try {
    file = await file.save();
    if (file_partner.length > 0) {
      for (var i in file_partner) {
        var notice = new Notice({
          toUser: file_partner[i],
          fromUser: user._id,
          type: "addPartner",
          content: file._id
        });
        try {
          notice = await notice.save();
        } catch (e) {
          console.log(e);
          ctx.body = {
            success: false,
            err: e
          };
          return next;
        }
      }
    }
  } catch (e) {
    console.log(e);
    ctx.body = {
      success: false,
      err: e
    };
    return next;
  }
  var id = file._id;
  file = await File.findOne({ _id: id })
    .populate("file_owner", userFields.join(" "))
    .populate("file_partner", userFields.join(" "))
    .exec();
  ctx.body = {
    success: true,
    file: file
  };
};

exports.list = async (ctx, next) => {
  var body = ctx.request.body;
  var listType = ctx.request.body.listType;
  var user = ctx.session.user;
  var data = [];
  if (listType == "file_owner") {
    data = await File.find({ file_owner: user._id })
      .sort({
        createTime: -1
      })
      .populate("file_owner", userFields.join(" "))
      .populate("file_partner", userFields.join(" "))
      .exec();
  } else if (listType == "file_partner") {
    data = await File.find({ file_partner: { $all: user._id } })
      .sort({
        createTime: -1
      })
      .populate("file_owner", userFields.join(" "))
      .populate("file_partner", userFields.join(" "))
      .exec();
  }
  ctx.body = {
    success: true,
    data: data,
    total: data.length
  };
};

exports.delete = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  await File.remove({ _id: body._id });
  try {
    await File.remove({ _id: body._id });
  } catch (e) {
    console.log(e);
    ctx.body = {
      success: false,
      err: e
    };
    return next;
  }
  ctx.body = {
    success: true
  };
};

exports.quitPartner = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  var file = await File.findOne({ _id: body._id });
  if (file) {
    var file_partner = file.file_partner;
    var index = -1;
    for (var i = 0; i < file_partner.length; i++) {
      if (file_partner[i].toString == user._id.toString) {
        index = i;
      }
    }
    if (index != -1) {
      file_partner.splice(index, 1);
      file.file_partner = file_partner;
      try {
        file = await file.save();
      } catch (e) {
        console.log(e);
        ctx.body = {
          success: false,
          err: e
        };
        return next;
      }
      ctx.body = {
        success: true,
        data: file
      };
    } else {
      ctx.body = {
        success: false,
        err: "你不是协作者哦"
      };
    }
  } else {
    ctx.body = {
      success: false,
      err: "此文件不存在"
    };
  }
};

exports.update = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  var file = await File.findOne({ _id: body._id }).exec();
  if (file) {
    if (body.file_title) {
      file.file_title = body.file_title;
    } else if (body.file_details) {
      file.file_details = body.file_details;
    } else if (body.file_partner) {
      var file_partner = [];
      if (body.file_partner.length > 0) {
        for (var i in body.file_partner) {
          var partner = await User.findOne({ user_name: body.file_partner[i] });
          file_partner.push(partner._id.toString());
        }
      }
      file.file_partner = file_partner;
    }
    try {
      file = await file.save();
      file = await File.findOne({ _id: file._id })
        .populate("file_owner", userFields.join(" "))
        .populate("file_partner", userFields.join(" "))
        .exec();
      if (file_partner.length > 0) {
        for (var i in file_partner) {
          var notice = new Notice({
            toUser: file_partner[i],
            fromUser: user._id,
            type: "addPartner",
            content: file._id
          });
          try {
            notice = await notice.save();
          } catch (e) {
            console.log(e);
            ctx.body = {
              success: false,
              err: e
            };
            return next;
          }
        }
      }
    } catch (e) {
      console.log(e);
      ctx.body = {
        success: false,
        err: e
      };
      return next;
    }
    ctx.body = {
      success: true,
      data: file
    };
  } else {
    ctx.body = {
      success: false,
      err: "该文件不存在"
    };
  }
};

exports.getData = async (ctx, next) => {
  var body = ctx.request.body;
  var user = ctx.session.user;
  var file = await File.findOne({ _id: body._id }).exec();
  if (file) {
    ctx.body = {
      success: true,
      data: file
    };
  } else {
    ctx.body = {
      success: false,
      err: "该文件不存在"
    };
  }
};
